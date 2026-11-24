import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { signAppToken } from "@vmenu/common";
import { createApp } from "../../src/app.js";
import { app, signUp, useRestaurantDb } from "./restaurant-app.js";

useRestaurantDb();

describe("sign-up and sign-in", () => {
    it("creates a restaurant and gives the owner all three roles", async () => {
        const slug = await signUp();
        const res = await request(app).post("/api/auth/memberships").send({ idToken: "owner1:owner@x.com" });
        expect(res.body[`Mee Keav - ${slug}`].sort()).toEqual(["cashier", "chef", "owner"]);
    });

    it("rejects a sign-in Firebase did not sign", async () => {
        const res = await request(app).post("/api/auth/login").send({ idToken: "garbage", role: "owner" });
        expect(res.status).toBe(401);
    });

    it("issues a staff token tied to one restaurant, and sets the cookie", async () => {
        const slug = await signUp();
        const res = await request(app).post("/api/auth/login").send({ idToken: "owner1:owner@x.com", role: "cashier", resSlug: slug });
        expect(res.status).toBe(200);
        expect(res.headers["set-cookie"]![0]).toMatch(/^token=.*HttpOnly/);
    });

    it("answers the sign-in with the httpOnly cookie only, never the token in the body (SEC-01)", async () => {
        const slug = await signUp();
        const res = await request(app).post("/api/auth/login").send({ idToken: "owner1:owner@x.com", role: "cashier", resSlug: slug });
        expect(res.status).toBe(200);
        expect(res.headers["set-cookie"]![0]).toMatch(/^token=[^;]+;.*HttpOnly.*SameSite=Lax/i);
        expect(JSON.stringify(res.body)).not.toMatch(/eyJ/); // no JWT anywhere in the answer
        expect(res.body.appToken).toBeUndefined();
    });

    it("a staff email match counts only when the email is verified (VM-13)", async () => {
        const slug = await signUp();
        const { _id: resId } = (await mongoose.connection.db!.collection("restaurants").findOne({ slug }))!;
        await mongoose.connection
            .db!.collection("tenants")
            .insertOne({ name: "Bob", tenantId: null, email: "bob@x.com", role: "cashier", resId: String(resId) });
        const login = (idToken: string) => request(app).post("/api/auth/login").send({ idToken, role: "cashier", resSlug: slug });
        expect((await login("mallory:bob@x.com:unverified")).status).toBe(401);
        expect((await request(app).post("/api/auth/memberships").send({ idToken: "mallory:bob@x.com:unverified" })).body).toEqual({});
        expect((await login("bob:bob@x.com")).status).toBe(200);
    });

    it("blocks a NoSQL-injection style email", async () => {
        await signUp();
        const res = await request(app)
            .post("/api/auth/memberships")
            .send({ idToken: { $ne: null } });
        expect(res.status).toBe(401);
    });
});

// VM-03: staff stay signed in for a whole shift; the token and the cookie last as long.
describe("who am I (VM-20)", () => {
    it("answers with the signed-in person's name, from their cookie", async () => {
        await signUp();
        const login = await request(app).post("/api/auth/login").send({ idToken: "owner1:owner@x.com", role: "owner" });
        const res = await request(app).get("/api/auth/me").set!("cookie", login.headers["set-cookie"]![0]!.split(";")[0]!);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ name: "Ory", email: "owner@x.com", role: "owner" });
    });

    it("needs a session", async () => {
        expect((await request(app).get("/api/auth/me")).status).toBe(401);
    });
});

describe("session length (VM-03)", () => {
    // SEC-01: the token is only in the httpOnly cookie
    const cookieToken = (res: { headers: Record<string, unknown> }) =>
        decodeURIComponent(/^token=([^;]+)/.exec((res.headers["set-cookie"] as string[])[0]!)![1]!);
    const lifetime = (token: string) => {
        const { iat, exp } = JSON.parse(Buffer.from(token.split(".")[1]!, "base64url").toString());
        return exp - iat;
    };
    const cookieMaxAge = (res: request.Response) => Number(/Max-Age=(\d+)/.exec(res.headers["set-cookie"]![0]!)![1]);

    it("lasts 12 hours by default, for the token and the cookie", async () => {
        const slug = await signUp();
        const res = await request(app).post("/api/auth/login").send({ idToken: "owner1:owner@x.com", role: "chef", resSlug: slug });
        expect(lifetime(cookieToken(res))).toBe(12 * 3600);
        expect(cookieMaxAge(res)).toBe(12 * 3600);
    });

    it("can be set with SESSION_HOURS", async () => {
        const slug = await signUp();
        process.env.SESSION_HOURS = "8";
        try {
            const res = await request(app).post("/api/auth/login").send({ idToken: "owner1:owner@x.com", role: "cashier", resSlug: slug });
            expect(lifetime(cookieToken(res))).toBe(8 * 3600);
            expect(cookieMaxAge(res)).toBe(8 * 3600);
        } finally {
            delete process.env.SESSION_HOURS;
        }
    });
});

describe("input checks name the fields (CL-05, VM-17)", () => {
    it("a bad staff member is a 400 with the fields to fix", async () => {
        await signUp();
        const token = await signAppToken({ uid: "owner1", email: "owner@x.com", role: "owner" });
        const auth = { authorization: `Bearer ${token}` };
        const { body: r } = await request(app).post("/api/restaurants").set(auth).send({ name: "Fields" });
        const res = await request(app)
            .post(`/api/restaurants/${r.slug}/staff`)
            .set(auth)
            .send({ name: "Bob", email: "bob", tenantId: "b", role: "owner" });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe("INVALID_INPUT");
        expect(Object.keys(res.body.fields).sort()).toEqual(["email", "role"]);
    });
});

describe("failed sign-ins are counted (SEC-10)", () => {
    const failures = async (reason: string) => {
        const { text } = await request(app).get("/metrics");
        const line = text.split("\n").find((l) => l.startsWith("vmenu_auth_failures_total{") && l.includes(`reason="${reason}"`));
        return line ? Number(line.split(" ").pop()) : 0;
    };

    it("no Firebase token", async () => {
        const before = await failures("no_token");
        expect((await request(app).post("/api/auth/login").send({ role: "owner" })).status).toBe(401);
        expect(await failures("no_token")).toBe(before + 1);
    });

    it("a token Firebase doesn't confirm", async () => {
        const before = await failures("bad_token");
        expect((await request(app).post("/api/auth/login").send({ idToken: "nonsense", role: "owner" })).status).toBe(401);
        expect(await failures("bad_token")).toBe(before + 1);
    });

    it("a real account without that role", async () => {
        const slug = await signUp();
        const before = await failures("wrong_role");
        const asOwner = await request(app).post("/api/auth/login").send({ idToken: "someone:someone@x.com", role: "owner" });
        const asChef = await request(app).post("/api/auth/login").send({ idToken: "someone:someone@x.com", role: "chef", resSlug: slug });
        expect([asOwner.status, asChef.status]).toEqual([401, 401]);
        expect(await failures("wrong_role")).toBe(before + 2);
    });

    it("the sign-in rate limit counts, and its answer stays the same", async () => {
        const limited = createApp({ verifyIdToken: async () => ({ uid: "u", email: "u@x.com", emailVerified: true }) });
        const before = await failures("rate_limited");
        let last: request.Response | undefined;
        for (let i = 0; i < 31; i++) last = await request(limited).post("/api/auth/logout");
        expect(last!.status).toBe(429);
        expect(last!.text).toBe("Too many requests, please try again later.");
        expect(await failures("rate_limited")).toBe(before + 1);
    });
});
