import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Request } from "express";
import { SignJWT } from "jose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
    assertRestaurantAccess,
    baseApp,
    callService,
    finish,
    maskEmail,
    rateLimitHandler,
    requireInternal,
    requireRole,
    signAppToken,
    type AppUser,
} from "../src/index.js";

// SEC-10: every refused request is logged and counted, with the reason, and without the secret parts.
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";

const RES = { _id: "665f00000000000000000001", ownerId: "owner1" };
const chef: AppUser = { uid: "c1", email: "sokha@gmail.com", role: "chef", resId: RES._id, resSlug: "mee-keav" };
const lines: { fields: Record<string, unknown>; text: string }[] = [];
let upstream: Server;

const app = baseApp();
// Keeps what the error handler logs for each request.
app.use((req, _res, next) => {
    (req as unknown as { log: unknown }).log = {
        warn: (fields: Record<string, unknown>, msg: string) => lines.push({ fields, text: JSON.stringify([fields, msg]) }),
        error: () => undefined,
        info: () => undefined,
    };
    next();
});
app.get("/api/orders/:slug/kitchen", requireRole("chef"), (req, res) => {
    assertRestaurantAccess(req.user!, req.params.slug === "mee-keav" ? RES : { _id: "665f00000000000000000002", ownerId: "x" });
    res.json({ ok: true });
});
app.post("/api/orders/:slug/kitchen", requireRole("chef"), (_req, res) => {
    res.json({ ok: true });
});
app.get("/internal/thing", requireInternal, (_req, res) => {
    res.json({ ok: true });
});
app.get("/limited", (req, res, next) => rateLimitHandler(req, res, next, { statusCode: 429, message: "Too many requests" }));
app.get("/forwarded", async (req, _res, next) => {
    const { port } = upstream.address() as AddressInfo;
    await callService(`http://127.0.0.1:${port}`, "/", req as Request).catch(next);
});
finish(app);

const failures = async (reason: string) => {
    const { text } = await request(app).get("/metrics");
    const line = text.split("\n").find((l) => l.startsWith("vmenu_auth_failures_total{") && l.includes(`reason="${reason}"`));
    return line ? Number(line.split(" ").pop()) : 0;
};
const cookie = (token: string) => ({ cookie: `token=${token}` });
const KITCHEN = "/api/orders/mee-keav/kitchen";

beforeAll(async () => {
    upstream = createServer((_req, res) => {
        res.writeHead(403, { "content-type": "application/json" });
        res.end(JSON.stringify({ message: "No access" }));
    });
    await new Promise<void>((r) => upstream.listen(0, "127.0.0.1", r));
});
afterAll(() => upstream.close());
beforeEach(() => {
    lines.length = 0;
});

describe("each refusal counts under its reason (SEC-10)", () => {
    const signExpired = () =>
        new SignJWT({ ...chef })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuer("v-menu")
            .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
            .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
            .sign(new TextEncoder().encode(process.env.JWT_SECRET));

    const cases: [string, number, () => Promise<request.Response>][] = [
        ["no_token", 401, async () => request(app).get(KITCHEN)],
        ["bad_token", 401, async () => request(app).get(KITCHEN).set(cookie("not.a.token"))],
        [
            "expired",
            401,
            async () =>
                request(app)
                    .get(KITCHEN)
                    .set(cookie(await signExpired())),
        ],
        [
            "wrong_role",
            403,
            async () =>
                request(app)
                    .get(KITCHEN)
                    .set(cookie(await signAppToken({ ...chef, role: "cashier" }))),
        ],
        [
            "other_restaurant",
            403,
            async () =>
                request(app)
                    .get("/api/orders/other-place/kitchen")
                    .set(cookie(await signAppToken(chef))),
        ],
        ["rate_limited", 429, async () => request(app).get("/limited")],
        ["cross_site", 403, async () => request(app).post(KITCHEN).set("Origin", "https://elsewhere.example")],
    ];

    it.each(cases)("%s: answers %i and adds one to the counter", async (reason, status, send) => {
        const before = await failures(reason);
        expect((await send()).status).toBe(status);
        expect(await failures(reason)).toBe(before + 1);
    });

    it("internal routes: a missing key and a wrong key count apart", async () => {
        const none = await failures("no_token");
        const wrong = await failures("bad_token");
        expect((await request(app).get("/internal/thing")).status).toBe(401);
        expect((await request(app).get("/internal/thing").set("x-internal-key", "wrong-value-here")).status).toBe(401);
        expect(await failures("no_token")).toBe(none + 1);
        expect(await failures("bad_token")).toBe(wrong + 1);
    });

    it("every reason is on /metrics at 0 from the start, so the alert doesn't miss the first one", async () => {
        const { text } = await request(app).get("/metrics");
        for (const reason of ["no_token", "bad_token", "expired", "wrong_role", "other_restaurant", "rate_limited", "cross_site", "other"])
            expect(text).toContain(`reason="${reason}"`);
    });

    it("a refusal passed on from another service is counted once, by the service that refused", async () => {
        const before = await failures("other");
        expect((await request(app).get("/forwarded")).status).toBe(403);
        expect(await failures("other")).toBe(before);
    });

    it("a successful request counts nothing", async () => {
        const before = await failures("wrong_role");
        expect(
            (
                await request(app)
                    .get(KITCHEN)
                    .set(cookie(await signAppToken(chef)))
            ).status,
        ).toBe(200);
        expect(await failures("wrong_role")).toBe(before);
        expect(lines).toHaveLength(0);
    });
});

describe("the log line (SEC-10)", () => {
    it("has the route, role, restaurant and reason", async () => {
        const token = await signAppToken(chef);
        await request(app).get("/api/orders/other-place/kitchen").set(cookie(token));
        expect(lines).toHaveLength(1);
        expect(lines[0].fields).toMatchObject({
            status: 403,
            reason: "other_restaurant",
            method: "GET",
            route: "/api/orders/:slug/kitchen",
            restaurant: "other-place",
            role: "chef",
            callerRestaurant: RES._id,
        });
    });

    it("never has the token or the full email; the email is masked", async () => {
        const token = await signAppToken(chef);
        await request(app).get("/api/orders/other-place/kitchen").set(cookie(token));
        expect(lines[0].text).not.toContain(token);
        expect(lines[0].text).not.toContain("sokha@gmail.com");
        expect(lines[0].fields.email).toBe("s***@gmail.com");
    });

    it("leaves a bad token and the query string out", async () => {
        await request(app).get(`${KITCHEN}?secret=abc123`).set(cookie("forged.token.value"));
        expect(lines[0].text).not.toContain("forged.token.value");
        expect(lines[0].text).not.toContain("abc123");
    });

    it("never logs an internal key", async () => {
        await request(app).get("/internal/thing").set("x-internal-key", "wrong-value-here");
        expect(lines[0].text).not.toContain("wrong-value-here");
    });

    it("the answer doesn't tell the caller the reason", async () => {
        const res = await request(app).get(KITCHEN).set(cookie("not.a.token"));
        expect(res.body).toEqual({ message: "Invalid or expired token" });
    });
});

describe("maskEmail", () => {
    it.each([
        ["sokha@gmail.com", "s***@gmail.com"],
        ["a@x.io", "a***@x.io"],
        ["not-an-email", "***"],
        ["@nothing.com", "***"],
        ["", "***"],
    ])("%s -> %s", (email, masked) => expect(maskEmail(email)).toBe(masked));

    it("copes with a missing value", () => expect(maskEmail(undefined)).toBeUndefined());
});
