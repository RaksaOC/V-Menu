import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireRole, setSessionLookup, signAppToken, type AppUser } from "../src/index.js";

// SEC-03: a session counts only while its version matches the person's current one, checked with a
// short cache so a change reaches every service within 30 seconds.
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";
process.env.RESTAURANT_SERVICE_URL = "http://restaurant.test";

const app = express();
app.get("/staff", requireRole("cashier", "owner"), (req, res) => res.json({ uid: req.user!.uid }));
app.use((err: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
    res.status(err.status ?? 500).end(),
);

const cashier: AppUser = { uid: "dara", email: "dara@x.test", role: "cashier", resId: "r1", resSlug: "bistro" };
const call = async (user: AppUser) =>
    (
        await request(app)
            .get("/staff")
            .set("cookie", `token=${await signAppToken(user)}`)
    ).status;

let current: number | null;
const lookup = vi.fn(async () => current);

beforeEach(() => {
    current = 3;
    lookup.mockClear();
    setSessionLookup(lookup);
});
afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe("checking the session version (SEC-03)", () => {
    it("a token with the current version gets in", async () => {
        expect(await call({ ...cashier, tv: 3 })).toBe(200);
    });

    it("a token with an older version gets 401", async () => {
        expect(await call({ ...cashier, tv: 2 })).toBe(401);
    });

    it("a token whose membership is gone gets 401", async () => {
        current = null;
        expect(await call({ ...cashier, tv: 3 })).toBe(401);
    });

    it("a token from before this release counts as version 0", async () => {
        current = 0;
        expect(await call(cashier)).toBe(200);
        setSessionLookup(lookup);
        current = 1;
        expect(await call(cashier)).toBe(401);
    });

    it("the wrong role is refused without asking for the version", async () => {
        const res = await request(app)
            .get("/staff")
            .set("cookie", `token=${await signAppToken({ ...cashier, role: "chef", tv: 3 })}`);
        expect(res.status).toBe(403);
        expect(lookup).not.toHaveBeenCalled();
    });

    it("answers are cached briefly, and a change takes effect within 30 seconds", async () => {
        vi.useFakeTimers({ toFake: ["Date"] });
        const token = { ...cashier, tv: 3 };
        expect(await call(token)).toBe(200);
        expect(await call(token)).toBe(200);
        expect(lookup).toHaveBeenCalledTimes(1);

        current = null; // removed
        vi.advanceTimersByTime(30_000);
        expect(await call(token)).toBe(401);
    });

    it("signing in again right after a change works, though the cache still has the old version", async () => {
        vi.useFakeTimers({ toFake: ["Date"] });
        expect(await call({ ...cashier, tv: 3 })).toBe(200);
        current = 4; // signed out everywhere, then signed in again with a new token
        expect(await call({ ...cashier, tv: 4 })).toBe(200);
        expect(await call({ ...cashier, tv: 3 })).toBe(401); // and the old token no longer works
    });

    it("someone added back right after being removed isn't held out by the cache", async () => {
        vi.useFakeTimers({ toFake: ["Date"] });
        current = null;
        expect(await call({ ...cashier, tv: 0 })).toBe(401);
        current = 0;
        expect(await call({ ...cashier, tv: 0 })).toBe(200);
    });

    it("keeps one answer per person, role and restaurant", async () => {
        expect(await call({ ...cashier, tv: 3 })).toBe(200);
        expect(await call({ ...cashier, resId: "r2", tv: 3 })).toBe(200);
        expect(await call({ ...cashier, uid: "sok", tv: 3 })).toBe(200);
        expect(lookup).toHaveBeenCalledTimes(3);
    });

    it("can skip the cache, for the service that holds the data", async () => {
        setSessionLookup(lookup, { cache: false });
        const token = { ...cashier, tv: 3 };
        expect(await call(token)).toBe(200);
        current = 4;
        expect(await call(token)).toBe(401);
    });

    it("when the check can't run the answer is 503, so nobody is signed out by an outage", async () => {
        setSessionLookup(async () => {
            throw new Error("down");
        });
        expect(await call({ ...cashier, tv: 3 })).toBe(503);
    });
});

describe("asking restaurant-service (SEC-03)", () => {
    const answer = (status: number, body: unknown) =>
        vi.fn(async (_url: string | URL, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));

    it("calls the internal route with the internal key", async () => {
        setSessionLookup();
        const fetchMock = answer(200, { version: 3 });
        vi.stubGlobal("fetch", fetchMock);
        expect(await call({ ...cashier, uid: "asks", tv: 3 })).toBe(200);
        const [url, init] = fetchMock.mock.calls[0]!;
        expect(String(url)).toBe("http://restaurant.test/internal/sessions/version?uid=asks&role=cashier&resId=r1");
        expect((init!.headers as Record<string, string>)["x-internal-key"]).toBe("internal-test-key");
    });

    it("an owner's check has no restaurant", async () => {
        setSessionLookup();
        const fetchMock = answer(200, { version: 0 });
        vi.stubGlobal("fetch", fetchMock);
        expect(await call({ uid: "own", email: "o@x.test", role: "owner" })).toBe(200);
        expect(String(fetchMock.mock.calls[0]![0])).toBe("http://restaurant.test/internal/sessions/version?uid=own&role=owner");
    });

    it.each([404, 500])("a %i from restaurant-service is a 503, never a sign-out", async (status) => {
        setSessionLookup();
        vi.stubGlobal("fetch", answer(status, { message: "nope" }));
        expect(await call({ ...cashier, uid: `err-${status}`, tv: 3 })).toBe(503);
    });
});
