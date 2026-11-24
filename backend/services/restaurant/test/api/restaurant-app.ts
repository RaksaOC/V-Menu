// CL-14: the setup the restaurant-service API tests share.
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, expect } from "vitest";
import { startMemoryMongo } from "@vmenu/common/testing";
import { createApp } from "../../src/app.js";

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";
process.env.COOKIE_SECURE = "false";

// Fake Firebase: an "ID token" here is just "uid:email", or "uid:email:unverified" for an account
// whose email isn't verified yet (VM-13).
export const newApp = () =>
    createApp({
        verifyIdToken: async (t) => {
            const [uid, email, unverified] = t.split(":");
            if (!uid || !email) throw new Error("bad token");
            return { uid, email, emailVerified: unverified !== "unverified" };
        },
    });
// A new app for each test: /api/auth allows 30 requests a minute per app, and this file signs up
// and signs in far more often than that. The limit itself is tested below (SEC-10).
export let app = newApp();

/** A fresh database for this test file, emptied before each test, and a new app per test. */
export function useRestaurantDb() {
    let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
    beforeAll(async () => {
        mongo = await startMemoryMongo("restaurants");
    });
    afterAll(async () => {
        await mongo.stop();
    });
    beforeEach(async () => {
        await mongoose.connection.db!.dropDatabase();
        app = newApp();
    });
}

export async function signUp(uid = "owner1", email = "owner@x.com") {
    const res = await request(app)
        .post("/api/auth/signup")
        .send({ idToken: `${uid}:${email}`, ownerName: "Ory", resName: "Mee Keav" });
    expect(res.status).toBe(201);
    return res.body.slug as string;
}
