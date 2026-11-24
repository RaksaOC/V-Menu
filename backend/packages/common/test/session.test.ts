import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { baseApp, finish, requireRole, sameOrigin, signAppToken } from "../src/index.js";

// SEC-01: the session lives only in the httpOnly cookie, and cross-site writes are refused.
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";

const app = express();
app.get("/me", requireRole("owner"), (req, res) => res.json({ uid: req.user!.uid }));
app.use((err: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
    res.status(err.status ?? 500).end(),
);

const ownerToken = () => signAppToken({ uid: "owner1", email: "o@x.com", role: "owner" });
const saved = process.env.AUTH_ALLOW_BEARER;
afterEach(() => {
    process.env.AUTH_ALLOW_BEARER = saved;
    delete process.env.ALLOWED_ORIGINS;
});

describe("reading the session", () => {
    it("a request with the cookie works", async () => {
        const res = await request(app)
            .get("/me")
            .set("cookie", `token=${await ownerToken()}`);
        expect(res.status).toBe(200);
        expect(res.body.uid).toBe("owner1");
    });

    it("a request with only a Bearer header gets 401 when the flag is off", async () => {
        process.env.AUTH_ALLOW_BEARER = "false";
        expect(
            (
                await request(app)
                    .get("/me")
                    .set("authorization", `Bearer ${await ownerToken()}`)
            ).status,
        ).toBe(401);
        delete process.env.AUTH_ALLOW_BEARER;
        expect(
            (
                await request(app)
                    .get("/me")
                    .set("authorization", `Bearer ${await ownerToken()}`)
            ).status,
        ).toBe(401);
    });

    it("tests and internal tools may still use Bearer, with AUTH_ALLOW_BEARER=true", async () => {
        process.env.AUTH_ALLOW_BEARER = "true";
        expect(
            (
                await request(app)
                    .get("/me")
                    .set("authorization", `Bearer ${await ownerToken()}`)
            ).status,
        ).toBe(200);
    });
});

describe("Origin check on writes (CSRF)", () => {
    const site = express();
    site.use(sameOrigin);
    site.all("/x", (_req, res) => res.json({ ok: true }));
    site.use((err: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
        res.status(err.status ?? 500).json({}),
    );

    it("a write from another site gets 403", async () => {
        for (const method of ["post", "put", "patch", "delete"] as const) {
            const res = await request(site)[method]("/x").set("host", "v-menu.example").set("origin", "https://evil.example");
            expect(res.status, method).toBe(403);
        }
    });

    it("a write from the site itself is fine, directly or through the Next proxy", async () => {
        expect((await request(site).post("/x").set("host", "v-menu.example").set("origin", "https://v-menu.example")).status).toBe(200);
        // Next forwards /api/* to the service with Host = the service, x-forwarded-host = the site
        const proxied = await request(site)
            .post("/x")
            .set("host", "127.0.0.1:4103")
            .set("x-forwarded-host", "v-menu.example")
            .set("origin", "https://v-menu.example");
        expect(proxied.status).toBe(200);
    });

    it("reads aren't checked, and a write without an Origin (server to server, curl) is allowed", async () => {
        expect((await request(site).get("/x").set("host", "v-menu.example").set("origin", "https://evil.example")).status).toBe(200);
        expect((await request(site).post("/x").set("host", "v-menu.example")).status).toBe(200);
    });

    it("refuses an opaque 'null' origin", async () => {
        expect((await request(site).post("/x").set("host", "v-menu.example").set("origin", "null")).status).toBe(403);
    });

    it("ALLOWED_ORIGINS adds other sites", async () => {
        process.env.ALLOWED_ORIGINS = "https://admin.example, https://other.example";
        expect((await request(site).post("/x").set("host", "v-menu.example").set("origin", "https://other.example")).status).toBe(200);
    });

    it("every service applies it (baseApp)", async () => {
        const svc = baseApp();
        svc.post("/api/thing", (_req, res) => res.json({ ok: true }));
        const res = await request(finish(svc))
            .post("/api/thing")
            .set("host", "127.0.0.1:4101")
            .set("x-forwarded-host", "v-menu.example")
            .set("origin", "https://evil.example");
        expect(res.status).toBe(403);
    });
});
