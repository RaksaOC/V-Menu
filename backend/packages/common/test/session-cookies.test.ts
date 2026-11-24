import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { requireRole, sessionCookieName, signAppToken, type AppUser } from "../src/index.js";

// SEC-12: one session cookie per role. An owner who also works the cashier screen keeps both sign-ins in
// one browser, and a cookie another app on the parent domain sets (a "token" cookie) is never read.
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";

const app = express();
app.get("/owner-only", requireRole("owner"), (req, res) => res.json({ role: req.user!.role }));
app.get("/either", requireRole("owner", "cashier"), (req, res) => res.json({ role: req.user!.role }));
app.use((err: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
    res.status(err.status ?? 500).end(),
);

const owner: AppUser = { uid: "u1", email: "o@x.com", role: "owner" };
const cashier: AppUser = { uid: "u1", email: "o@x.com", role: "cashier", resId: "665f00000000000000000001", resSlug: "mee-keav" };

describe("the cookie names", () => {
    it("are one per role, with the __Host- prefix on https", () => {
        expect(sessionCookieName("owner", true)).toBe("__Host-vmenu_owner");
        expect(sessionCookieName("cashier", true)).toBe("__Host-vmenu_cashier");
        expect(sessionCookieName("chef", true)).toBe("__Host-vmenu_chef");
        expect(sessionCookieName("chef", false)).toBe("vmenu_chef"); // browsers refuse __Host- without Secure
    });
});

describe("reading the session for a role", () => {
    it("an owner signed in as cashier too keeps the owner session", async () => {
        const jar = `__Host-vmenu_cashier=${await signAppToken(cashier)}; __Host-vmenu_owner=${await signAppToken(owner)}`;
        const res = await request(app).get("/owner-only").set("cookie", jar);
        expect(res.status).toBe(200);
        expect(res.body.role).toBe("owner");
    });

    it("the page's role picks the session when both would do", async () => {
        const jar = `__Host-vmenu_owner=${await signAppToken(owner)}; __Host-vmenu_cashier=${await signAppToken(cashier)}`;
        const asCashier = await request(app).get("/either").set("cookie", jar).set("x-vmenu-role", "cashier");
        expect(asCashier.body.role).toBe("cashier");
        const asOwner = await request(app).get("/either").set("cookie", jar).set("x-vmenu-role", "owner");
        expect(asOwner.body.role).toBe("owner");
    });

    it("the page's role only chooses among the route's roles", async () => {
        const jar = `__Host-vmenu_owner=${await signAppToken(owner)}`;
        expect((await request(app).get("/owner-only").set("cookie", jar).set("x-vmenu-role", "chef")).status).toBe(200);
    });

    it("plain-http names work too (local dev and e2e)", async () => {
        expect(
            (
                await request(app)
                    .get("/owner-only")
                    .set("cookie", `vmenu_owner=${await signAppToken(owner)}`)
            ).status,
        ).toBe(200);
    });

    it("another app's token cookie is ignored, and is no session on its own", async () => {
        const mine = `__Host-vmenu_owner=${await signAppToken(owner)}`;
        expect((await request(app).get("/owner-only").set("cookie", `token=someone.elses.cookie; ${mine}`)).status).toBe(200);
        expect(
            (
                await request(app)
                    .get("/owner-only")
                    .set("cookie", `token=${await signAppToken(owner)}`)
            ).status,
        ).toBe(401);
    });

    it("a cookie can't claim a role it doesn't carry", async () => {
        // a cashier token put in the owner cookie is still a cashier token
        const res = await request(app)
            .get("/owner-only")
            .set("cookie", `__Host-vmenu_owner=${await signAppToken(cashier)}`);
        expect(res.status).toBe(403);
    });
});
