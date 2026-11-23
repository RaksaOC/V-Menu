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
import { notFound } from "@vmenu/common";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// SEC-07: every menu-service route, tried as every kind of caller. A new route fails the
// inventory test until it's added here with its rule.
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";
trackRoutes();
const { createApp } = await import("../../src/app.js");
const { Item } = await import("../../src/models/item.model.js");
const { Table } = await import("../../src/models/table.model.js");
const { mongoImagesRepo } = await import("../../src/repositories/images.repo.js");

const A = { _id: "665f00000000000000000001", name: "A", slug: "rest-a", ownerId: "owner-a" };
const B = { _id: "665f00000000000000000002", name: "B", slug: "rest-b", ownerId: "owner-b" };
const app = createApp({
    lookupRestaurant: async (_req, slug) => {
        const r = [A, B].find((x) => x.slug === slug);
        if (!r) throw notFound("Restaurant not found");
        return r;
    },
});

const staff = only(["owner", "cashier"]);
const owner = only(["owner"]);

// [route as Express lists it, rule]
const MATRIX: [string, AccessRow][] = [
    ["GET /health", PUBLIC],
    ["GET /ready", PUBLIC],
    ["GET /version", PUBLIC],
    ["GET /metrics", PUBLIC],
    ["GET /api/menu/:slug/public/items", PUBLIC],
    ["GET /api/menu/:slug/public/tables/:name", PUBLIC],
    ["GET /api/menu/:slug/images/:id", PUBLIC],
    ["GET /api/menu/:slug/items", staff],
    ["PATCH /api/menu/:slug/items/:id/availability", staff],
    ["GET /api/menu/:slug/tables", staff],
    ["PATCH /api/menu/:slug/tables/:id/availability", staff],
    ["POST /api/menu/:slug/items", owner],
    ["PUT /api/menu/:slug/items/:id", owner],
    ["DELETE /api/menu/:slug/items/:id", owner],
    ["POST /api/menu/:slug/images", owner],
    ["POST /api/menu/:slug/tables", owner],
    ["PUT /api/menu/:slug/tables/:id", owner],
    ["DELETE /api/menu/:slug/tables/:id", owner],
    ["GET /internal/restaurants/:resId/counts", NO_APP_TOKEN],
    ["POST /internal/restaurants/:resId/order-check", NO_APP_TOKEN],
];

let mongo: MongoMemoryServer;
let headers: Awaited<ReturnType<typeof callerHeaders>>;
const ids: Record<string, string> = {};
beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri("menu-access"));
    headers = await callerHeaders(A, B);
});
afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});
beforeEach(async () => {
    await mongoose.connection.db!.dropDatabase();
    const img = `/api/menu/${A.slug}/images/${"a".repeat(24)}`;
    ids.itemA = String((await Item.create({ name: "Amok", price: 5, image: img, resId: A._id }))._id);
    ids.tableA = String((await Table.create({ name: "T1", resId: A._id, isEnabled: true }))._id);
    ids.itemB = String((await Item.create({ name: "B dish", price: 3, image: img, resId: B._id }))._id);
    ids.tableB = String((await Table.create({ name: "B1", resId: B._id, isEnabled: true }))._id);
    ids.imageB = await mongoImagesRepo.save(Buffer.from("RIFF0000WEBPVP8 "), B._id);
});

/** The route with A's slug and A's real ids filled in. */
function urlFor(route: string) {
    const path = route.split(" ")[1];
    return path
        .replace(":slug", A.slug)
        .replace(":resId", A._id)
        .replace(":name", "T1")
        .replace(/items\/:id/, `items/${ids.itemA}`)
        .replace(/tables\/:id/, `tables/${ids.tableA}`)
        .replace(/images\/:id/, `images/${"b".repeat(24)}`);
}

function send(method: string, url: string, caller: Caller, extra: Record<string, string> = {}, body: object = {}) {
    const m = method.toLowerCase() as "get" | "post" | "put" | "patch" | "delete";
    return request(app)
        [m](url)
        .set({ ...headers[caller], ...extra })
        .send(method === "GET" || method === "DELETE" ? undefined : body);
}

describe("menu-service access matrix (SEC-07)", () => {
    it("every registered route is in the matrix, and every row is a real route", () => {
        expect(listRoutes(app)).toEqual(MATRIX.map(([r]) => r).sort());
    });

    it.each(MATRIX)("%s", async (route, row) => {
        const method = route.split(" ")[0];
        const got = {} as Record<Caller, number>;
        // refused callers first, so an allowed DELETE can't change what they see
        for (const caller of [...CALLERS].sort((x, y) => Number(row[x] === "ok") - Number(row[y] === "ok")))
            got[caller] = (await send(method, urlFor(route), caller)).status;
        expect(mismatches(row, got)).toEqual([]);
    });

    it("internal routes answer with the internal key", async () => {
        const key = { "x-internal-key": "internal-test-key" };
        expect((await send("GET", `/internal/restaurants/${A._id}/counts`, "guest", key)).status).toBe(200);
    });
});

// The classic attack: keep your own restaurant in the URL, put another restaurant's id in it.
describe("another restaurant's ids, through your own restaurant (SEC-07)", () => {
    const cases: [string, string, () => string, Caller][] = [
        ["PUT", "item", () => `/api/menu/${A.slug}/items/${ids.itemB}`, "owner"],
        ["DELETE", "item", () => `/api/menu/${A.slug}/items/${ids.itemB}`, "owner"],
        ["PATCH", "item", () => `/api/menu/${A.slug}/items/${ids.itemB}/availability`, "cashier"],
        ["PUT", "table", () => `/api/menu/${A.slug}/tables/${ids.tableB}`, "owner"],
        ["DELETE", "table", () => `/api/menu/${A.slug}/tables/${ids.tableB}`, "owner"],
        ["PATCH", "table", () => `/api/menu/${A.slug}/tables/${ids.tableB}/availability`, "cashier"],
        ["GET", "image", () => `/api/menu/${A.slug}/images/${ids.imageB}`, "guest"],
    ];
    it.each(cases)("%s B's %s through A is 404, and B's data is unchanged", async (method, _what, url, caller) => {
        // a valid body, so only the restaurant check stands in the way
        const body = url().endsWith("/availability") ? { isEnabled: false } : method === "PUT" ? { name: "Renamed" } : {};
        const res = await send(method, url(), caller, {}, body);
        expect(res.status).toBe(404);
        expect(await Item.findById(ids.itemB).lean()).toMatchObject({ name: "B dish", price: 3, isEnabled: true });
        expect(await Table.findById(ids.tableB).lean()).toMatchObject({ name: "B1", isEnabled: true });
    });
});
