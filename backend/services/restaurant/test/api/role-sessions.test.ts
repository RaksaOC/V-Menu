import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { app, signUp, useRestaurantDb } from "./restaurant-app.js";

// SEC-12: signing in to one screen doesn't sign you out of another in the same browser.
useRestaurantDb();
afterEach(() => {
    process.env.COOKIE_SECURE = "false";
});

const cookies = (res: request.Response) => (res.headers["set-cookie"] as unknown as string[]) ?? [];
const pair = (c: string) => c.split(";")[0]!;

describe("one session cookie per role (SEC-12)", () => {
    it("signing in sets that role's cookie and clears the old shared one", async () => {
        const slug = await signUp();
        const res = await request(app).post("/api/auth/login").send({ idToken: "owner1:owner@x.com", role: "cashier", resSlug: slug });
        expect(res.status).toBe(200);
        expect(cookies(res)[0]).toMatch(/^vmenu_cashier=[^;]+;.*HttpOnly.*SameSite=Lax/i);
        expect(cookies(res).some((c) => /^token=;/.test(c))).toBe(true);
    });

    it("on https the cookie is __Host-: Secure, path /, no Domain", async () => {
        const slug = await signUp();
        process.env.COOKIE_SECURE = "true";
        const res = await request(app).post("/api/auth/login").send({ idToken: "owner1:owner@x.com", role: "owner", resSlug: slug });
        const c = cookies(res)[0]!;
        expect(c).toMatch(/^__Host-vmenu_owner=[^;]+;/);
        expect(c).toMatch(/;\s*Secure/i);
        expect(c).toMatch(/;\s*Path=\/(;|$)/i);
        expect(c).not.toMatch(/Domain=/i);
    });

    it("an owner who signs in as cashier is still the owner on the owner pages", async () => {
        const slug = await signUp();
        const asOwner = await request(app).post("/api/auth/login").send({ idToken: "owner1:owner@x.com", role: "owner" });
        const asCashier = await request(app)
            .post("/api/auth/login")
            .send({ idToken: "owner1:owner@x.com", role: "cashier", resSlug: slug });
        const jar = `${pair(cookies(asOwner)[0]!)}; ${pair(cookies(asCashier)[0]!)}`;
        const ownerMe = await request(app).get("/api/auth/me").set("cookie", jar).set("x-vmenu-role", "owner");
        expect(ownerMe.status).toBe(200);
        expect(ownerMe.body.role).toBe("owner");
        const cashierMe = await request(app).get("/api/auth/me").set("cookie", jar).set("x-vmenu-role", "cashier");
        expect(cashierMe.body.role).toBe("cashier");
    });

    it("signing out of one screen leaves the other signed in", async () => {
        const res = await request(app).post("/api/auth/logout").set("x-vmenu-role", "cashier");
        expect(res.status).toBe(200);
        expect(cookies(res).some((c) => /^vmenu_cashier=;/.test(c))).toBe(true);
        expect(cookies(res).some((c) => /^vmenu_owner=;/.test(c))).toBe(false);
    });

    it("signing out with no screen given clears every role", async () => {
        const res = await request(app).post("/api/auth/logout");
        for (const role of ["owner", "cashier", "chef"]) expect(cookies(res).some((c) => c.startsWith(`vmenu_${role}=;`))).toBe(true);
    });
});
