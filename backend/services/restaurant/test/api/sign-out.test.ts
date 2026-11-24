import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, signUp, useRestaurantDb } from "./restaurant-app.js";

// SEC-01 (review follow-up): signing out must always work. The sign-in rate limit (30 a minute per
// client) protects sign-up and sign-in; it must not keep a session alive that the person ended.
useRestaurantDb();

/** Uses up this app's sign-in limit with harmless requests, and checks it really is used up. */
async function useUpTheLimit() {
    for (let i = 0; i < 30; i++) await request(app).post("/api/auth/memberships").send({});
    expect((await request(app).post("/api/auth/memberships").send({})).status).toBe(429);
}

describe("sign-out isn't held back by the sign-in rate limit (SEC-01)", () => {
    it("POST /api/auth/logout still clears the cookie when the limit is used up", async () => {
        await useUpTheLimit();
        const res = await request(app).post("/api/auth/logout");
        expect(res.status).toBe(200);
        expect(res.headers["set-cookie"]![0]).toMatch(/^token=;/);
    });

    it("POST /api/auth/sign-out-everywhere still ends the sessions when the limit is used up", async () => {
        await signUp();
        const login = await request(app).post("/api/auth/login").send({ idToken: "owner1:owner@x.com", role: "owner" });
        const cookie = login.headers["set-cookie"]![0]!.split(";")[0]!;
        await useUpTheLimit();
        const out = await request(app).post("/api/auth/sign-out-everywhere").set("cookie", cookie);
        expect(out.status).toBe(200);
        expect(out.headers["set-cookie"]![0]).toMatch(/^token=;/);
        expect((await request(app).get("/api/auth/me").set("cookie", cookie)).status).toBe(401);
    });

    it("signing out doesn't use up the sign-in limit either", async () => {
        for (let i = 0; i < 40; i++) expect((await request(app).post("/api/auth/logout")).status).toBe(200);
        expect((await request(app).post("/api/auth/memberships").send({})).status).toBe(400); // still under the limit
    });
});
