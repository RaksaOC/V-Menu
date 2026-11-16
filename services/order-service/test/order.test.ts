import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { signAppToken } from "../src/lib/auth.js";
import type { Clients } from "../src/lib/clients.js";
import { HttpError, notFound } from "../src/lib/errors.js";

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";

const R = { _id: "665f00000000000000000001", name: "Mee Keav", slug: "mee-keav-abc123", ownerId: "owner1" };
const ITEM = { _id: "665f0000000000000000aaaa", name: "Kuy Teav", price: 2.5, image: "k.jpg", isEnabled: true };
let menuUp = true;

// Stand-ins for restaurant-service and menu-service.
const clients: Clients = {
    listOwnerRestaurants: async (_req, ownerId) => (ownerId === "owner1" ? [R] : []),
    menuCounts: async () => ({ numOfTables: 4, numOfActiveTables: 2, numOfItems: 10 }),
    orderCheck: async (_req, _resId, body) => {
        if (!menuUp) throw new HttpError(503, "A required service is unavailable");
        if (body.table !== "1") throw new HttpError(409, "Table is not available");
        // The browser said the price was 0; the menu answers with the real one.
        return { items: body.items.map((l) => ({ item: ITEM, quantity: l.quantity })) };
    },
};
const app = createApp({
    clients,
    lookupRestaurant: async (_req, slug) => {
        if (slug !== R.slug) throw notFound("Restaurant not found");
        return R;
    },
});

let mongo: MongoMemoryServer;
let chef: Record<string, string>, cashier: Record<string, string>, owner: Record<string, string>;
beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri("orders"));
    const staff = { resId: R._id, resSlug: R.slug };
    chef = { authorization: `Bearer ${await signAppToken({ uid: "u1", email: "c@x.com", role: "chef", ...staff })}` };
    cashier = { authorization: `Bearer ${await signAppToken({ uid: "u2", email: "k@x.com", role: "cashier", ...staff })}` };
    owner = { authorization: `Bearer ${await signAppToken({ uid: "owner1", email: "o@x.com", role: "owner" })}` };
});
afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});
beforeEach(async () => {
    menuUp = true;
    await mongoose.connection.db!.dropDatabase();
});

const place = (table = "1", quantity = 2) =>
    request(app).post(`/api/orders/${R.slug}`).send({ table, orderedItems: [{ item: { _id: ITEM._id, price: 0 }, quantity }] });

describe("placing orders", () => {
    it("uses the menu's price and groups orders into one open bill per table", async () => {
        const first = await place();
        expect(first.status).toBe(201);
        expect(first.body.orderedItems[0].item.price).toBe(2.5);
        await place();
        const bills = await request(app).get(`/api/orders/${R.slug}/bills`).set(cashier);
        expect(bills.body).toHaveLength(1);
        expect(bills.body[0].orders).toHaveLength(2);
    });

    it("passes on menu-service's answer for a closed table", async () => {
        expect((await place("9")).status).toBe(409);
    });

    it("answers 503 when menu-service is down", async () => {
        menuUp = false;
        expect((await place()).status).toBe(503);
    });
});

describe("kitchen and cashier", () => {
    it("chef marks an order done; cashier marks the bill paid", async () => {
        const { body: order } = await place();
        expect((await request(app).patch(`/api/orders/${R.slug}/kitchen/${order._id}/done`).set(cashier)).status).toBe(403);
        const done = await request(app).patch(`/api/orders/${R.slug}/kitchen/${order._id}/done`).set(chef);
        expect(done.body.isDone).toBe(true);
        const [bill] = (await request(app).get(`/api/orders/${R.slug}/bills`).set(cashier)).body;
        const paid = await request(app).patch(`/api/orders/${R.slug}/bills/${bill._id}`).set(cashier).send({ isPayed: true });
        expect(paid.body.isPayed).toBe(true);
        const overview = await request(app).get(`/api/orders/${R.slug}/overview`).set(owner);
        expect(overview.body).toMatchObject({ numOfOrders: 1, numOfPayments: 1, numOfUnpaidOrders: 0, numOfTables: 4 });
    });

    it("totals money and top sellers for the owner", async () => {
        const { body: order } = await place("1", 3);
        await request(app).patch(`/api/orders/${R.slug}/kitchen/${order._id}/done`).set(chef);
        const res = await request(app).get("/api/orders/owner/overview").set(owner);
        expect(res.body).toMatchObject({ numOfMoneyEarned: 7.5, totalItemsSold: 3, topSellingItems: [{ name: "Kuy Teav", quantity: 3 }] });
    });
});
