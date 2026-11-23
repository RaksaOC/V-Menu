import {
    CALLERS,
    callerHeaders,
    listRoutes,
    mismatches,
    NO_APP_TOKEN,
    only,
    PUBLIC,
    trackRoutes,
    type AccessRow,
    type Caller,
} from "@vmenu/common/testing";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// SEC-07: every restaurant-service route, tried as every kind of caller. A new route fails the
// inventory test until it's added here with its rule.
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";
trackRoutes();
const { createApp } = await import("../../src/app.js");
const { Restaurant } = await import("../../src/models/restaurant.model.js");
const { Membership } = await import("../../src/models/membership.model.js");

const A = { _id: "665f00000000000000000001", name: "A", slug: "rest-a", ownerId: "owner-a" };
const B = { _id: "665f00000000000000000002", name: "B", slug: "rest-b", ownerId: "owner-b" };
// No Firebase ID token is valid here: an app token must never stand in for one.
const app = createApp({
    verifyIdToken: async () => {
        throw new Error("not a Firebase ID token");
    },
});

const owner = only(["owner"]);
const ownersOwnData = only(["owner"], { ownData: true }); // no :slug, works on the caller's own restaurants

const MATRIX: [string, AccessRow][] = [
    ["GET /health", PUBLIC],
    ["GET /ready", PUBLIC],
    ["GET /version", PUBLIC],
    ["GET /metrics", PUBLIC],
    ["POST /api/auth/logout", PUBLIC],
    ["POST /api/auth/login", NO_APP_TOKEN], // Firebase ID token only
    ["POST /api/auth/signup", NO_APP_TOKEN],
    ["POST /api/auth/memberships", NO_APP_TOKEN],
    ["GET /api/restaurants", ownersOwnData],
    ["POST /api/restaurants", ownersOwnData],
    ["GET /api/staff", ownersOwnData],
    ["GET /api/restaurants/:slug/staff", owner],
    ["POST /api/restaurants/:slug/staff", owner],
    ["PUT /api/restaurants/:slug/staff/:id", owner],
    ["DELETE /api/restaurants/:slug/staff/:id", owner],
    ["GET /api/restaurants/:slug/settings", PUBLIC], // VM-24: customers' pages show prices in the restaurant's currency
    ["PUT /api/restaurants/:slug/settings", owner],
    ["GET /internal/restaurants", NO_APP_TOKEN],
    ["GET /internal/restaurants/by-slug/:slug", NO_APP_TOKEN],
];

let mongo: MongoMemoryServer;
let headers: Awaited<ReturnType<typeof callerHeaders>>;
const ids: Record<string, string> = {};
beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri("restaurant-access"));
    headers = await callerHeaders(A, B);
});
afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});
beforeEach(async () => {
    await mongoose.connection.db!.dropDatabase();
    await Restaurant.create([A, B]);
    ids.staffA = String(
        (await Membership.create({ name: "Cash A", tenantId: "cashier-a", email: "c@a.test", role: "cashier", resId: A._id }))._id,
    );
    ids.staffB = String(
        (await Membership.create({ name: "Cash B", tenantId: "cashier-b", email: "c@b.test", role: "cashier", resId: B._id }))._id,
    );
});

const urlFor = (route: string) => route.split(" ")[1].replace(":slug", A.slug).replace(":id", ids.staffA);

// /api/auth has a rate limit per address: give every request its own, as separate visitors would have.
let visitor = 0;
function send(method: string, url: string, caller: Caller, extra: Record<string, string> = {}) {
    const m = method.toLowerCase() as "get" | "post" | "put" | "patch" | "delete";
    visitor += 1;
    const ip = `198.18.${Math.floor(visitor / 250)}.${(visitor % 250) + 1}`;
    return request(app)
        [m](url)
        .set({ ...headers[caller], "x-forwarded-for": ip, ...extra })
        .send(method === "GET" || method === "DELETE" ? undefined : {});
}

describe("restaurant-service access matrix (SEC-07)", () => {
    it("every registered route is in the matrix, and every row is a real route", () => {
        expect(listRoutes(app)).toEqual(MATRIX.map(([r]) => r).sort());
    });

    it.each(MATRIX)("%s", async (route, row) => {
        const method = route.split(" ")[0];
        const got = {} as Record<Caller, number>;
        for (const caller of [...CALLERS].sort((x, y) => Number(row[x] === "ok") - Number(row[y] === "ok")))
            got[caller] = (await send(method, urlFor(route), caller)).status;
        expect(mismatches(row, got)).toEqual([]);
    });

    it("internal routes answer with the internal key", async () => {
        const res = await send("GET", `/internal/restaurants/by-slug/${A.slug}`, "guest", { "x-internal-key": "internal-test-key" });
        expect(res.status).toBe(200);
    });
});

describe("another restaurant's ids, through your own restaurant (SEC-07)", () => {
    it.each(["PUT", "DELETE"])("%s B's staff member through A is 404, and they are unchanged", async (method) => {
        const res = await send(method, `/api/restaurants/${A.slug}/staff/${ids.staffB}`, "owner");
        expect(res.status).toBe(404);
        expect(await Membership.findById(ids.staffB).lean()).toMatchObject({ name: "Cash B", role: "cashier", resId: B._id });
    });
});
