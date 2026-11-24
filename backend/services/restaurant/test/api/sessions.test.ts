import { signAppToken } from "@vmenu/common";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startMemoryMongo, tokenFor } from "@vmenu/common/testing";
import { createApp } from "../../src/app.js";

// SEC-03, through the real routes and MongoDB. Its own file because /api/auth is rate limited per app.
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";
process.env.COOKIE_SECURE = "false";

// Fake Firebase: an "ID token" here is just "uid:email".
const app = createApp({
    verifyIdToken: async (t) => {
        const [uid, email] = t.split(":");
        if (!uid || !email) throw new Error("bad token");
        return { uid, email, emailVerified: true };
    },
});

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
beforeAll(async () => {
    mongo = await startMemoryMongo("restaurants");
});
afterAll(async () => {
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

describe("ending sessions (SEC-03)", () => {
    const internal = { "x-internal-key": "internal-test-key" };
    const versionOf = async (query: Record<string, string>) =>
        (await request(app).get("/internal/sessions/version").query(query).set(internal)).body.version;

    it("a staff member's version is gone once they're removed", async () => {
        const slug = await signUp();
        const auth = await tokenFor("owner", { ownerId: "owner1" });
        const added = await request(app)
            .post(`/api/restaurants/${slug}/staff`)
            .set(auth)
            .send({ name: "Sok", email: "sok@x.com", role: "chef" });
        await request(app).post("/api/auth/login").send({ idToken: "sok-uid:sok@x.com", role: "chef", resSlug: slug });
        const query = { uid: "sok-uid", role: "chef", resId: added.body.resId };
        expect(await versionOf(query)).toBe(0);
        await request(app).delete(`/api/restaurants/${slug}/staff/${added.body._id}`).set(auth);
        expect(await versionOf(query)).toBeNull();
    });

    it("a role change raises the version", async () => {
        const slug = await signUp();
        const auth = await tokenFor("owner", { ownerId: "owner1" });
        const added = await request(app)
            .post(`/api/restaurants/${slug}/staff`)
            .set(auth)
            .send({ name: "Sok", email: "sok@x.com", role: "chef" });
        await request(app).post("/api/auth/memberships").send({ idToken: "sok-uid:sok@x.com" });
        await request(app).put(`/api/restaurants/${slug}/staff/${added.body._id}`).set(auth).send({ role: "cashier" });
        expect(await versionOf({ uid: "sok-uid", role: "cashier", resId: added.body.resId })).toBe(1);
    });

    it("Sign out everywhere ends this token at once and clears the cookie", async () => {
        await signUp();
        const login = await request(app).post("/api/auth/login").send({ idToken: "owner1:owner@x.com", role: "owner" });
        const cookie = login.headers["set-cookie"]![0]!.split(";")[0]!;
        expect((await request(app).get("/api/restaurants").set!("cookie", cookie)).status).toBe(200);
        const out = await request(app).post("/api/auth/sign-out-everywhere").set!("cookie", cookie);
        expect(out.status).toBe(200);
        expect(out.headers["set-cookie"]![0]).toMatch(/^token=;/);
        expect((await request(app).get("/api/restaurants").set!("cookie", cookie)).status).toBe(401);
        const again = await request(app).post("/api/auth/login").send({ idToken: "owner1:owner@x.com", role: "owner" });
        expect((await request(app).get("/api/restaurants").set!("cookie", again.headers["set-cookie"]![0]!.split(";")[0]!)).status).toBe(
            200,
        );
    });

    it("a token for someone with no membership is refused", async () => {
        const token = await signAppToken({ uid: "nobody", email: "n@x.com", role: "owner" });
        expect((await request(app).get("/api/restaurants").set("authorization", `Bearer ${token}`)).status).toBe(401);
    });
});
