import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { signAppToken } from "@vmenu/common";

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";
process.env.COOKIE_SECURE = "false";

// Fake Firebase: an "ID token" here is just "uid:email", or "uid:email:unverified" for an account
// whose email isn't verified yet (VM-13).
const app = createApp({
    verifyIdToken: async (t) => {
        const [uid, email, unverified] = t.split(":");
        if (!uid || !email) throw new Error("bad token");
        return { uid, email, emailVerified: unverified !== "unverified" };
    },
});

let mongo: MongoMemoryServer;
beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri("restaurants"));
});
afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});
beforeEach(async () => {
    await mongoose.connection.db!.dropDatabase();
});

async function signUp(uid = "owner1", email = "owner@x.com") {
    const res = await request(app)
        .post("/api/auth/signup")
        .send({ idToken: `${uid}:${email}`, ownerName: "Ory", resName: "Mee Keav" });
    expect(res.status).toBe(201);
    return res.body.slug as string;
}

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
        expect(res.headers["set-cookie"][0]).toMatch(/^token=.*HttpOnly/);
    });

    it("answers the sign-in with the httpOnly cookie only, never the token in the body (SEC-01)", async () => {
        const slug = await signUp();
        const res = await request(app).post("/api/auth/login").send({ idToken: "owner1:owner@x.com", role: "cashier", resSlug: slug });
        expect(res.status).toBe(200);
        expect(res.headers["set-cookie"][0]).toMatch(/^token=[^;]+;.*HttpOnly.*SameSite=Lax/i);
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

describe("restaurant settings (VM-24)", () => {
    it("anyone reads them; the owner changes them; they're kept", async () => {
        const slug = await signUp();
        const read = await request(app).get(`/api/restaurants/${slug}/settings`);
        expect(read.status).toBe(200);
        expect(read.body).toEqual({ name: "Mee Keav", currency: "USD", khrPerUsd: 4100, paymentQrUrl: null });
        const token = await signAppToken({ uid: "owner1", email: "owner@x.com", role: "owner" });
        const qr = `/api/menu/${slug}/images/${"c".repeat(24)}`;
        const saved = await request(app)
            .put(`/api/restaurants/${slug}/settings`)
            .set("authorization", `Bearer ${token}`)
            .send({ currency: "KHR", khrPerUsd: 4050, paymentQrUrl: qr });
        expect(saved.status).toBe(200);
        expect((await request(app).get(`/api/restaurants/${slug}/settings`)).body).toEqual({
            name: "Mee Keav",
            currency: "KHR",
            khrPerUsd: 4050,
            paymentQrUrl: qr,
        });
    });

    it("refuses another owner and a bad currency", async () => {
        const slug = await signUp("owner1", "a@x.com");
        const other = await signAppToken({ uid: "owner2", email: "b@x.com", role: "owner" });
        const mine = await signAppToken({ uid: "owner1", email: "a@x.com", role: "owner" });
        const put = (t: string, body: object) =>
            request(app).put(`/api/restaurants/${slug}/settings`).set("authorization", `Bearer ${t}`).send(body);
        expect((await put(other, { currency: "KHR" })).status).toBe(403);
        expect((await put(mine, { currency: "EUR" })).status).toBe(400);
    });
});

describe("owner routes", () => {
    it("keeps owners out of restaurants they do not own", async () => {
        const slug = await signUp("owner1", "a@x.com");
        await signUp("owner2", "b@x.com"); // a real owner, of another restaurant (SEC-03)
        const other = await signAppToken({ uid: "owner2", email: "b@x.com", role: "owner" });
        const res = await request(app).get(`/api/restaurants/${slug}/staff`).set("authorization", `Bearer ${other}`);
        expect(res.status).toBe(403);
    });

    it("adds, edits and removes a cashier", async () => {
        const slug = await signUp();
        const token = await signAppToken({ uid: "owner1", email: "owner@x.com", role: "owner" });
        const auth = { authorization: `Bearer ${token}` };
        const added = await request(app)
            .post(`/api/restaurants/${slug}/staff`)
            .set(auth)
            .send({ name: "Visal", email: "V@x.com", tenantId: "u9", role: "cashier" });
        expect(added.status).toBe(201);
        expect(added.body.email).toBe("v@x.com");
        const edited = await request(app).put(`/api/restaurants/${slug}/staff/${added.body._id}`).set(auth).send({ role: "chef" });
        expect(edited.body.role).toBe("chef");
        const promote = await request(app).put(`/api/restaurants/${slug}/staff/${added.body._id}`).set(auth).send({ role: "owner" });
        expect(promote.status).toBe(400);
        const removed = await request(app).delete(`/api/restaurants/${slug}/staff/${added.body._id}`).set(auth);
        expect(removed.status).toBe(200);
    });

    it("invites a cashier by email; their first verified sign-in links the account (VM-12)", async () => {
        const slug = await signUp();
        const auth = { authorization: `Bearer ${await signAppToken({ uid: "owner1", email: "owner@x.com", role: "owner" })}` };
        const invited = await request(app)
            .post(`/api/restaurants/${slug}/staff`)
            .set(auth)
            .send({ name: "Dara", email: "dara@x.com", role: "cashier" });
        expect(invited.status).toBe(201);
        expect(invited.body.tenantId).toBeNull();
        expect((await request(app).post("/api/auth/memberships").send({ idToken: "dara-uid:dara@x.com:unverified" })).body).toEqual({});
        const roles = await request(app).post("/api/auth/memberships").send({ idToken: "dara-uid:dara@x.com" });
        expect(roles.body).toEqual({ [`Mee Keav - ${slug}`]: ["cashier"] });
        const [linked] = (await request(app).get(`/api/restaurants/${slug}/staff`).set(auth)).body.filter(
            (m: { email: string }) => m.email === "dara@x.com",
        );
        expect(linked.tenantId).toBe("dara-uid");
    });

    it("changing a role into one the person already has here is a 409 (VM-18)", async () => {
        const slug = await signUp();
        const auth = { authorization: `Bearer ${await signAppToken({ uid: "owner1", email: "owner@x.com", role: "owner" })}` };
        const add = (role: string) =>
            request(app).post(`/api/restaurants/${slug}/staff`).set(auth).send({ name: "Sok", email: "sok@x.com", role });
        await add("cashier");
        const chef = await add("chef");
        const res = await request(app).put(`/api/restaurants/${slug}/staff/${chef.body._id}`).set(auth).send({ role: "cashier" });
        expect(res.status).toBe(409);
        expect(res.body.message).toBe("This person already has that role here");
        const rows = (await request(app).get(`/api/restaurants/${slug}/staff`).set(auth)).body.filter(
            (m: { email: string }) => m.email === "sok@x.com",
        );
        expect(rows.map((m: { role: string }) => m.role).sort()).toEqual(["cashier", "chef"]);
    });

    it("rejects a cashier token on owner routes", async () => {
        const token = await signAppToken({ uid: "u9", email: "v@x.com", role: "cashier" });
        const res = await request(app).get("/api/restaurants").set("authorization", `Bearer ${token}`);
        expect(res.status).toBe(403);
    });
});

describe("internal routes", () => {
    it("need the internal key", async () => {
        const slug = await signUp();
        expect((await request(app).get(`/internal/restaurants/by-slug/${slug}`)).status).toBe(401);
        const ok = await request(app).get(`/internal/restaurants/by-slug/${slug}`).set("x-internal-key", "internal-test-key");
        expect(ok.body).toMatchObject({ slug, ownerId: "owner1" });
    });
});

// VM-03: staff stay signed in for a whole shift; the token and the cookie last as long.
describe("who am I (VM-20)", () => {
    it("answers with the signed-in person's name, from their cookie", async () => {
        await signUp();
        const login = await request(app).post("/api/auth/login").send({ idToken: "owner1:owner@x.com", role: "owner" });
        const res = await request(app).get("/api/auth/me").set("cookie", login.headers["set-cookie"][0].split(";")[0]);
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
        decodeURIComponent(/^token=([^;]+)/.exec((res.headers["set-cookie"] as string[])[0])![1]);
    const lifetime = (token: string) => {
        const { iat, exp } = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
        return exp - iat;
    };
    const cookieMaxAge = (res: request.Response) => Number(/Max-Age=(\d+)/.exec(res.headers["set-cookie"][0])![1]);

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

describe("public restaurant info (VM-21)", () => {
    it("needs no sign-in, and answers only the name and slug", async () => {
        const slug = await signUp();
        const res = await request(app).get(`/api/restaurants/${slug}/public`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ name: "Mee Keav", slug }); // no id, owner id or email
    });

    it("an unknown restaurant is a 404 with a code the page can explain", async () => {
        const res = await request(app).get("/api/restaurants/nobody-here/public");
        expect(res.status).toBe(404);
        expect(res.body.code).toBe("RESTAURANT_NOT_FOUND");
    });

    it("the owner's routes next to it still need a sign-in", async () => {
        const slug = await signUp();
        expect((await request(app).get(`/api/restaurants/${slug}/staff`)).status).toBe(401);
    });
});
