import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { signAppToken, HttpError, notFound } from "@vmenu/common";
import { OrderCheckResponse } from "@vmenu/contracts";
import type { Clients } from "../../src/clients/index.js";
import { Bill } from "../../src/models/bill.model.js";
import { Order } from "../../src/models/order.model.js";
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
        return OrderCheckResponse.parse({ items: body.items.map((l) => ({ item: ITEM, quantity: l.quantity })) }); // CL-05
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

describe("kitchen queue and history (VM-10)", () => {
    const kitchen = (path = "") => request(app).get(`/api/orders/${R.slug}/kitchen${path}`).set(chef);
    const done = (id: string) => request(app).patch(`/api/orders/${R.slug}/kitchen/${id}/done`).set(chef);

    it("the queue has unfinished orders only, oldest first (the default, and ?status=active)", async () => {
        const a = (await place("1")).body;
        const b = (await place("1")).body; // (the fake menu check only accepts table "1")
        const c = (await place("1")).body;
        await done(b._id);
        for (const path of ["?status=active", ""]) {
            const res = await kitchen(path);
            expect(res.status).toBe(200);
            expect(res.body.map((o: { _id: string }) => o._id)).toEqual([a._id, c._id]);
        }
        expect((await kitchen("?status=everything")).status).toBe(400);
    });

    it("history: finished orders, newest first, 20 to a page, with the total", async () => {
        const docs = Array.from({ length: 25 }, (_, i) => ({
            table: "1",
            resId: R._id,
            isDone: true,
            orderedItems: [{ item: ITEM, quantity: 1 }],
            createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)),
        }));
        await Order.insertMany([...docs, { ...docs[0], isDone: false, createdAt: new Date(Date.UTC(2026, 0, 2)) }]);
        const first = await kitchen("/history?page=1&limit=20");
        expect(first.status).toBe(200);
        expect(first.body).toMatchObject({ page: 1, limit: 20, total: 25, pages: 2 });
        expect(first.body.orders).toHaveLength(20);
        expect(first.body.orders.every((o: { isDone: boolean }) => o.isDone)).toBe(true);
        expect(new Date(first.body.orders[0].createdAt).getUTCMinutes()).toBe(24); // newest first
        const second = await kitchen("/history?page=2");
        expect(second.body.orders).toHaveLength(5);
        expect(new Date(second.body.orders[4].createdAt).getUTCMinutes()).toBe(0);
        expect((await kitchen("/history?limit=500")).body.limit).toBe(100);
        expect((await kitchen("/history?page=0")).status).toBe(400);
        expect((await kitchen("/history?page=abc")).status).toBe(400);
    });

    it("only the chef can read them", async () => {
        expect((await request(app).get(`/api/orders/${R.slug}/kitchen/history`).set(cashier)).status).toBe(403);
    });

    it("is backed by an index, and answers fast with 5,000 orders", async () => {
        await Order.createIndexes();
        const names = (await Order.listIndexes()).map((i: { name: string }) => i.name);
        expect(names).toContain("resId_1_isDone_1_createdAt_1");
        const many = Array.from({ length: 5000 }, (_, i) => ({
            table: String(i % 30),
            resId: R._id,
            isDone: i % 1000 !== 0, // 5 still cooking
            orderedItems: [{ item: ITEM, quantity: 1 }],
        }));
        await Order.insertMany(many);
        await kitchen("?status=active"); // warm up
        const started = performance.now();
        const res = await kitchen("?status=active");
        expect(res.body).toHaveLength(5);
        expect(performance.now() - started).toBeLessThan(200);
    }, 30_000);
});

describe("cashier bills: open ones by default, paid history a page at a time (VM-11)", () => {
    const list = (query = "") => request(app).get(`/api/orders/${R.slug}/bills${query}`).set(cashier);
    const pay = (id: string) => request(app).patch(`/api/orders/${R.slug}/bills/${id}`).set(cashier).send({ isPayed: true });

    it("open bills only, with their orders: the default, and ?status=open", async () => {
        await place("1");
        const [earlier] = (await list()).body;
        await pay(earlier._id); // the table's earlier visit, paid
        await place("1"); // its next visit
        for (const query of ["", "?status=open"]) {
            const res = await list(query);
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0]._id).not.toBe(earlier._id);
            expect(res.body[0].orders[0].orderedItems[0].item.name).toBe("Kuy Teav");
        }
        expect((await list("?status=everything")).status).toBe(400);
    });

    it("paid bills: most recently paid first, 20 a page, with the total", async () => {
        await Bill.collection.insertMany(
            Array.from({ length: 23 }, (_, i) => ({
                table: `t${i}`,
                resId: R._id,
                isPayed: true,
                orders: [],
                createdAt: new Date(Date.UTC(2026, 0, 1)),
                updatedAt: new Date(Date.UTC(2026, 0, 1, 0, i)), // when it was paid
            })),
        );
        await place("1"); // one still open
        const first = await list("?status=paid&page=1");
        expect(first.status).toBe(200);
        expect(first.body).toMatchObject({ page: 1, limit: 20, total: 23, pages: 2 });
        expect(first.body.bills).toHaveLength(20);
        expect(first.body.bills[0].table).toBe("t22");
        expect(first.body.bills.every((b: { isPayed: boolean }) => b.isPayed)).toBe(true);
        const second = await list("?status=paid&page=2");
        expect(second.body.bills.map((b: { table: string }) => b.table)).toEqual(["t2", "t1", "t0"]);
        expect((await list("?status=paid&limit=500")).body.limit).toBe(100);
        expect((await list("?status=paid&page=0")).status).toBe(400);
    });

    it("is backed by an index", async () => {
        const names = (await Bill.listIndexes()).map((i: { name: string }) => i.name);
        expect(names).toContain("resId_1_isPayed_1_updatedAt_-1");
    });
});

describe("input checks name the fields (CL-05, VM-17)", () => {
    it("a bad order is a 400 with the fields to fix", async () => {
        const res = await request(app)
            .post(`/api/orders/${R.slug}`)
            .send({ table: "", orderedItems: [{ item: {}, quantity: 0 }] });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe("INVALID_INPUT");
        expect(Object.keys(res.body.fields).sort()).toEqual(["orderedItems.0.item._id", "orderedItems.0.quantity", "table"]);
    });

    it("marking a bill needs true or false", async () => {
        await place("1");
        const [bill] = (await request(app).get(`/api/orders/${R.slug}/bills`).set(cashier)).body;
        const res = await request(app).patch(`/api/orders/${R.slug}/bills/${bill._id}`).set(cashier).send({ isPayed: "yes" });
        expect(res.status).toBe(400);
        expect(res.body.fields).toEqual({ isPayed: "Must be true or false" });
    });
});

describe("isPayed is now isPaid; both work for one release (CL-06)", () => {
    const patch = (id: string, body: object) => request(app).patch(`/api/orders/${R.slug}/bills/${id}`).set(cashier).send(body);
    const openBill = async () => (await request(app).get(`/api/orders/${R.slug}/bills`).set(cashier)).body[0];

    it("bills answer with isPaid, and with isPayed for clients not yet updated", async () => {
        await place();
        const bill = await openBill();
        expect(bill).toMatchObject({ isPaid: false, isPayed: false });
    });

    it("a bill is marked paid with the new name, and reopened with the old one", async () => {
        await place();
        const { _id } = await openBill();
        const paid = await patch(_id, { isPaid: true });
        expect(paid.status).toBe(200);
        expect(paid.body).toMatchObject({ isPaid: true, isPayed: true });
        const reopened = await patch(_id, { isPayed: false });
        expect(reopened.status).toBe(200);
        expect(reopened.body.isPaid).toBe(false);
        expect((await Bill.findById(_id).lean())?.isPaid).toBe(false);
    });

    it("a bad value names the new field", async () => {
        await place();
        const res = await patch((await openBill())._id, { isPaid: "yes" });
        expect(res.status).toBe(400);
        expect(res.body.fields).toEqual({ isPaid: "Must be true or false" });
    });
});
