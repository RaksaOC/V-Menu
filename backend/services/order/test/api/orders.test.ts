import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { signAppToken, HttpError, notFound } from "@vmenu/common";
import type { Clients } from "../../src/clients/index.js";
import { Bill } from "../../src/models/bill.model.js";
import { mongoBillsRepo } from "../../src/repositories/bills.repo.js";

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
    await Bill.createIndexes(); // dropDatabase drops them too
});

const place = (table = "1", quantity = 2) =>
    request(app)
        .post(`/api/orders/${R.slug}`)
        .send({ table, orderedItems: [{ item: { _id: ITEM._id, price: 0 }, quantity }] });

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

describe("one open bill per table (VM-08)", () => {
    const bills = async () =>
        (await request(app).get(`/api/orders/${R.slug}/bills`).set(cashier)).body as {
            _id: string;
            table: string;
            isPayed: boolean;
            orders: unknown[];
        }[];
    const setPaid = (id: string, isPayed: boolean) =>
        request(app).patch(`/api/orders/${R.slug}/bills/${id}`).set(cashier).send({ isPayed });

    it("10 orders joining a table's bill at the same moment make exactly 1 open bill", async () => {
        // The bill upsert itself, as placing an order does it, 10 at once: without the unique
        // index, every run made several open bills.
        const orderIds = Array.from({ length: 10 }, () => new mongoose.Types.ObjectId().toString());
        await Promise.all(orderIds.map((id) => mongoBillsRepo.addToOpenBill(R._id, "1", id)));
        const open = await Bill.find({ resId: R._id, table: "1", isPayed: false }).lean();
        expect(open).toHaveLength(1);
        expect(open[0].orders.map(String).sort()).toEqual([...orderIds].sort());
    });

    it("10 orders placed at the same moment end up on exactly 1 open bill", async () => {
        const results = await Promise.all(Array.from({ length: 10 }, () => place("1", 1)));
        expect(results.map((r) => r.status)).toEqual(Array(10).fill(201));
        const open = (await bills()).filter((b) => b.table === "1" && !b.isPayed);
        expect(open).toHaveLength(1);
        expect(open[0].orders).toHaveLength(10);
    });

    it("re-opening a paid bill while the table has another open bill gives 409", async () => {
        await place();
        const [first] = await bills();
        expect((await setPaid(first._id, true)).status).toBe(200);
        await place(); // the table's next visit: a new open bill
        const res = await setPaid(first._id, false);
        expect(res.status).toBe(409);
        expect(res.body.code).toBe("TABLE_HAS_OPEN_BILL");
        expect((await bills()).filter((b) => !b.isPayed)).toHaveLength(1);
    });

    it("re-opening a paid bill is fine when the table has no other open bill", async () => {
        await place();
        const [first] = await bills();
        await setPaid(first._id, true);
        const res = await setPaid(first._id, false);
        expect(res.status).toBe(200);
        expect(res.body.isPayed).toBe(false);
    });
});

describe("what the customer sees after ordering (VM-07)", () => {
    const tableApi = (table: string, path: string) => request(app).get(`/api/orders/${R.slug}/tables/${encodeURIComponent(table)}${path}`);

    it("one order, at its own table: number, the server's prices and total, and when it was placed (no sign-in)", async () => {
        const { body: order } = await place("1", 2); // the browser said price 0
        const res = await tableApi("1", `/orders/${order._id}`);
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            _id: order._id,
            number: order._id.slice(-6).toUpperCase(),
            table: "1",
            lines: [{ name: "Kuy Teav", price: 2.5, quantity: 2, total: 5 }],
            total: 5,
        });
        expect(new Date(res.body.placedAt).getTime()).toBeGreaterThan(Date.now() - 60_000);
        expect(JSON.stringify(res.body)).not.toContain(R._id); // nothing internal
    });

    it("an order can't be read from another table, and unknown or bad ids are refused", async () => {
        const { body: order } = await place("1");
        expect((await tableApi("2", `/orders/${order._id}`)).status).toBe(404);
        expect((await tableApi("1", `/orders/${new mongoose.Types.ObjectId()}`)).status).toBe(404);
        expect((await tableApi("1", "/orders/nope")).status).toBe(400);
    });

    it("the table's open bill: only this table's open bill, with its orders and total", async () => {
        await place("1", 2);
        await place("1", 1);
        await place("2", 4); // another table
        const res = await tableApi("1", "/open-bill");
        expect(res.status).toBe(200);
        expect(res.body.table).toBe("1");
        expect(res.body.orders).toHaveLength(2);
        expect(res.body.orders.map((o: { total: number }) => o.total)).toEqual([5, 2.5]);
        expect(res.body.total).toBe(7.5);
        expect(JSON.stringify(res.body)).not.toContain(R._id);
    });

    it("once the bill is paid, the table's list is empty again", async () => {
        await place("1");
        const [bill] = (await request(app).get(`/api/orders/${R.slug}/bills`).set(cashier)).body;
        await request(app).patch(`/api/orders/${R.slug}/bills/${bill._id}`).set(cashier).send({ isPayed: true });
        const res = await tableApi("1", "/open-bill");
        expect(res.body).toEqual({ table: "1", orders: [], total: 0 });
    });
});
