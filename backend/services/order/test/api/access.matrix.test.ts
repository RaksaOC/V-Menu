import {
    CALLERS,
    callerHeaders,
    listRoutes,
    mismatches,
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
import type { Clients } from "../../src/clients/index.js";

// SEC-07: every order-service route, tried as every kind of caller. A new route fails the
// inventory test until it's added here with its rule.
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
trackRoutes();
const { createApp } = await import("../../src/app.js");
const { Order } = await import("../../src/models/order.model.js");
const { Bill } = await import("../../src/models/bill.model.js");

const A = { _id: "665f00000000000000000001", name: "A", slug: "rest-a", ownerId: "owner-a" };
const B = { _id: "665f00000000000000000002", name: "B", slug: "rest-b", ownerId: "owner-b" };
const DISH = { _id: "665f0000000000000000aaaa", name: "Kuy Teav", price: 2.5, image: "k.jpg", isEnabled: true };
const clients: Clients = {
    listOwnerRestaurants: async (_req, ownerId) => [A, B].filter((r) => r.ownerId === ownerId),
    menuCounts: async () => ({ numOfTables: 1, numOfActiveTables: 1, numOfItems: 1 }),
    orderCheck: async (_req, _resId, body) => ({ items: body.items.map((l) => ({ item: DISH, quantity: l.quantity })) }),
};
const app = createApp({
    clients,
    lookupRestaurant: async (_req, slug) => {
        const r = [A, B].find((x) => x.slug === slug);
        if (!r) throw notFound("Restaurant not found");
        return r;
    },
});

const MATRIX: [string, AccessRow][] = [
    ["GET /health", PUBLIC],
    ["GET /ready", PUBLIC],
    ["GET /version", PUBLIC],
    ["GET /metrics", PUBLIC],
    ["POST /api/orders/:slug", PUBLIC], // customers order without signing in
    ["GET /api/orders/:slug/tables/:table/orders/:id", PUBLIC], // only that table's order (VM-07)
    ["GET /api/orders/:slug/tables/:table/open-bill", PUBLIC],
    ["GET /api/orders/:slug/kitchen", only(["chef"])],
    ["GET /api/orders/:slug/kitchen/history", only(["chef"])],
    ["PATCH /api/orders/:slug/kitchen/:id/status", only(["chef"])],
    ["GET /api/orders/:slug/bills", only(["cashier"])],
    ["PATCH /api/orders/:slug/bills/:id", only(["cashier"])],
    ["PATCH /api/orders/:slug/bills/:id/orders/:orderId/cancel", only(["cashier"])],
    ["GET /api/orders/:slug/overview", only(["owner", "cashier"])],
    ["GET /api/orders/owner/restaurants", only(["owner"], { ownData: true })],
    ["GET /api/orders/owner/overview", only(["owner"], { ownData: true })],
];

let mongo: MongoMemoryServer;
let headers: Awaited<ReturnType<typeof callerHeaders>>;
const ids: Record<string, string> = {};
beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri("order-access"));
    headers = await callerHeaders(A, B);
});
afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});
beforeEach(async () => {
    await mongoose.connection.db!.dropDatabase();
    const order = (resId: string) => Order.create({ table: "1", resId, status: "pending", orderedItems: [{ item: DISH, quantity: 1 }] });
    const a = await order(A._id);
    const b = await order(B._id);
    ids.orderA = String(a._id);
    ids.orderB = String(b._id);
    ids.billA = String((await Bill.create({ table: "1", resId: A._id, isPaid: false, orders: [a._id] }))._id);
    ids.billB = String((await Bill.create({ table: "1", resId: B._id, isPaid: false, orders: [b._id] }))._id);
});

function urlFor(route: string) {
    return route
        .split(" ")[1]
        .replace(":slug", A.slug)
        .replace(":table", "1")
        .replace(":orderId", ids.orderA)
        .replace(/orders\/:id/, `orders/${ids.orderA}`)
        .replace(/kitchen\/:id/, `kitchen/${ids.orderA}`)
        .replace(/bills\/:id/, `bills/${ids.billA}`);
}

function send(method: string, url: string, caller: Caller, body: object = {}) {
    const m = method.toLowerCase() as "get" | "post" | "patch";
    return request(app)
        [m](url)
        .set(headers[caller])
        .send(method === "GET" ? undefined : body);
}

describe("order-service access matrix (SEC-07)", () => {
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
});

describe("another restaurant's ids, through your own restaurant (SEC-07)", () => {
    it("a cashier can't settle B's bill through A", async () => {
        expect((await send("PATCH", `/api/orders/${A.slug}/bills/${ids.billB}`, "cashier", { isPaid: true })).status).toBe(404);
        expect(await Bill.findById(ids.billB).lean()).toMatchObject({ isPaid: false });
    });

    it("a chef can't move B's order through A (VM-27)", async () => {
        expect((await send("PATCH", `/api/orders/${A.slug}/kitchen/${ids.orderB}/status`, "chef", { status: "preparing" })).status).toBe(
            404,
        );
        expect(await Order.findById(ids.orderB).lean()).toMatchObject({ status: "pending" });
    });

    it("a cashier can't cancel B's order through A's bill, or B's bill through A (VM-27)", async () => {
        const reason = { reason: "Not ours" };
        expect(
            (await send("PATCH", `/api/orders/${A.slug}/bills/${ids.billA}/orders/${ids.orderB}/cancel`, "cashier", reason)).status,
        ).toBe(404);
        expect(
            (await send("PATCH", `/api/orders/${A.slug}/bills/${ids.billB}/orders/${ids.orderB}/cancel`, "cashier", reason)).status,
        ).toBe(404);
        expect(await Order.findById(ids.orderB).lean()).toMatchObject({ status: "pending" });
    });

    it("a customer can't read B's order through A's table page", async () => {
        expect((await send("GET", `/api/orders/${A.slug}/tables/1/orders/${ids.orderB}`, "guest")).status).toBe(404);
    });
});
