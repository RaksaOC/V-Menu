import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { markShuttingDown } from "../src/lib/server.js";
import { signAppToken } from "../src/lib/auth.js";

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";
process.env.COOKIE_SECURE = "false";

// Fake Firebase: an "ID token" here is just "uid:email".
const app = createApp({
    verifyIdToken: async (t) => {
        const [uid, email] = t.split(":");
        if (!uid || !email) throw new Error("bad token");
        return { uid, email };
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
    const res = await request(app).post("/api/auth/signup").send({ idToken: `${uid}:${email}`, ownerName: "Ory", resName: "Mee Keav" });
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

    it("blocks a NoSQL-injection style email", async () => {
        await signUp();
        const res = await request(app).post("/api/auth/memberships").send({ idToken: { $ne: null } });
        expect(res.status).toBe(401);
    });
});

describe("owner routes", () => {
    it("keeps owners out of restaurants they do not own", async () => {
        const slug = await signUp("owner1", "a@x.com");
        const other = await signAppToken({ uid: "owner2", email: "b@x.com", role: "owner" });
        const res = await request(app).get(`/api/restaurants/${slug}/staff`).set("authorization", `Bearer ${other}`);
        expect(res.status).toBe(403);
    });

    it("adds, edits and removes a cashier", async () => {
        const slug = await signUp();
        const token = await signAppToken({ uid: "owner1", email: "owner@x.com", role: "owner" });
        const auth = { authorization: `Bearer ${token}` };
        const added = await request(app).post(`/api/restaurants/${slug}/staff`).set(auth).send({ name: "Visal", email: "V@x.com", tenantId: "u9", role: "cashier" });
        expect(added.status).toBe(201);
        expect(added.body.email).toBe("v@x.com");
        const edited = await request(app).put(`/api/restaurants/${slug}/staff/${added.body._id}`).set(auth).send({ role: "chef" });
        expect(edited.body.role).toBe("chef");
        const promote = await request(app).put(`/api/restaurants/${slug}/staff/${added.body._id}`).set(auth).send({ role: "owner" });
        expect(promote.status).toBe(400);
        const removed = await request(app).delete(`/api/restaurants/${slug}/staff/${added.body._id}`).set(auth);
        expect(removed.status).toBe(200);
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

// Kept last in the file: markShuttingDown() flips module state for the rest of the run.
describe("liveness and readiness", () => {
    it("/health says the process is up; /ready needs the database", async () => {
        const health = await request(app).get("/health");
        expect(health.status).toBe(200);
        expect(health.body.db).toBe(true);
        const ready = await request(app).get("/ready");
        expect(ready.status).toBe(200);
        expect(ready.body.status).toBe("ok");
    });

    it("/ready answers 503 once shutdown starts, /health stays 200", async () => {
        markShuttingDown();
        const ready = await request(app).get("/ready");
        expect(ready.status).toBe(503);
        expect(ready.body.shuttingDown).toBe(true);
        expect((await request(app).get("/health")).status).toBe(200);
    });
});
