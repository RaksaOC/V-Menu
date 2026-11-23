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
import { mongoOrdersRepo } from "../../src/repositories/orders.repo.js";

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";

const R = { _id: "665f00000000000000000001", name: "Mee Keav", slug: "mee-keav-abc123", ownerId: "owner1" };
const ITEM = { _id: "665f0000000000000000aaaa", name: "Kuy Teav", priceCents: 250, image: "k.jpg", isEnabled: true };
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

/** VM-27: the kitchen takes an order to served, one step at a time (what "done" used to be). */
async function serve(id: string) {
    let res;
    for (const status of ["preparing", "ready", "served"])
        res = await request(app).patch(`/api/orders/${R.slug}/kitchen/${id}/status`).set(chef).send({ status });
    return res!;
}

const place = (table = "1", quantity = 2) =>
    request(app)
        .post(`/api/orders/${R.slug}`)
        .send({ table, orderedItems: [{ item: { _id: ITEM._id, priceCents: 0 }, quantity }] });

describe("placing orders", () => {
    it("uses the menu's price and groups orders into one open bill per table", async () => {
        const first = await place();
        expect(first.status).toBe(201);
        expect(first.body.orderedItems[0].item.priceCents).toBe(250);
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

describe("an order is never left off its bill (VM-23)", () => {
    /** The real repository, whose bill update throws the first `times` calls. */
    function flakyApp(times: number) {
        let left = times;
        const fail = () => {
            if (left-- > 0) throw new Error("database hiccup");
        };
        const bills = {
            ...mongoBillsRepo,
            attachOrder: async (billId: string, orderId: string) => {
                fail();
                return mongoBillsRepo.attachOrder(billId, orderId);
            },
        };
        return createApp({ clients, bills, lookupRestaurant: async () => R });
    }
    const send = (target: ReturnType<typeof createApp>) =>
        request(target)
            .post(`/api/orders/${R.slug}`)
            .send({ table: "1", orderedItems: [{ item: { _id: ITEM._id }, quantity: 1 }] });

    it("the bill update fails once: 201, and the order is on the bill with its id", async () => {
        const res = await send(flakyApp(1));
        expect(res.status).toBe(201);
        expect(res.body).not.toHaveProperty("billId");
        const [bill] = await Bill.find({ resId: R._id }).lean();
        expect(bill.orders.map(String)).toEqual([res.body._id]);
        expect(String((await Order.findById(res.body._id).lean())!.billId)).toBe(String(bill._id));
    });

    it("the bill update keeps failing: 503, no order, and no empty bill", async () => {
        expect((await send(flakyApp(99))).status).toBe(503);
        expect(await Order.countDocuments()).toBe(0);
        expect(await Bill.countDocuments()).toBe(0);
    });

    it("the bill is paid between the two steps: the order moves to the table's new bill", async () => {
        const { body: first } = await place();
        const [paying] = await Bill.find({ resId: R._id }).lean();
        const orders = {
            ...mongoOrdersRepo,
            create: async (order: Parameters<typeof mongoOrdersRepo.create>[0]) => {
                const saved = await mongoOrdersRepo.create(order);
                await Bill.updateOne({ _id: paying._id }, { isPaid: true }); // the cashier, at the wrong moment
                return saved;
            },
        };
        const res = await send(createApp({ clients, orders, lookupRestaurant: async () => R }));
        expect(res.status).toBe(201);
        const open = await Bill.findOne({ resId: R._id, isPaid: false }).lean();
        expect(open!.orders.map(String)).toEqual([res.body._id]);
        expect(String((await Order.findById(res.body._id).lean())!.billId)).toBe(String(open!._id));
        expect((await Bill.findById(paying._id).lean())!.orders.map(String)).toEqual([first._id]);
    });

    it("the internal check lists an order that's on no bill, and not one that is", async () => {
        const old = new Date(Date.now() - 3_600_000);
        const line = [{ item: ITEM, quantity: 1 }];
        const lost = await Order.create({ table: "1", resId: R._id, orderedItems: line, createdAt: old });
        const billed = await Order.create({ table: "2", resId: R._id, orderedItems: line, createdAt: old });
        await Bill.create({ table: "2", resId: R._id, isPaid: false, orders: [billed._id] });
        const url = "/internal/orders/without-bill";
        expect((await request(app).get(url)).status).toBe(401);
        const res = await request(app).get(url).set("x-internal-key", "internal-test-key");
        expect(res.status).toBe(200);
        expect(res.body.count).toBe(1);
        expect(res.body.orders).toMatchObject([{ _id: String(lost._id), table: "1", resId: R._id }]);
    });
});

describe("kitchen and cashier", () => {
    it("chef serves an order; cashier marks the bill paid", async () => {
        const { body: order } = await place();
        const asCashier = request(app).patch(`/api/orders/${R.slug}/kitchen/${order._id}/status`).set(cashier);
        expect((await asCashier.send({ status: "preparing" })).status).toBe(403);
        expect((await serve(order._id)).body.status).toBe("served");
        const [bill] = (await request(app).get(`/api/orders/${R.slug}/bills`).set(cashier)).body;
        const paid = await request(app).patch(`/api/orders/${R.slug}/bills/${bill._id}`).set(cashier).send({ isPaid: true });
        expect(paid.body.isPaid).toBe(true);
        const overview = await request(app).get(`/api/orders/${R.slug}/overview`).set(owner);
        expect(overview.body).toMatchObject({ orderCount: 1, paymentCount: 1, unpaidBillCount: 0, tableCount: 4, revenueCents: 500 });
    });
});

describe("the owner's numbers come from paid bills (VM-09)", () => {
    const payTable = async () => {
        const [bill] = (await request(app).get(`/api/orders/${R.slug}/bills`).set(cashier)).body;
        await request(app).patch(`/api/orders/${R.slug}/bills/${bill._id}`).set(cashier).send({ isPaid: true });
    };

    it("an order on an open bill isn't revenue, even once served; paying the bill makes it revenue", async () => {
        const { body: order } = await place("1", 3);
        await serve(order._id);
        const before = await request(app).get("/api/orders/owner/overview").set(owner);
        expect(before.body).toMatchObject({ revenueCents: 0, itemsSoldCount: 0, unpaidBillCount: 1, topSellingItems: [] });
        await payTable();
        const after = await request(app).get("/api/orders/owner/overview").set(owner);
        expect(after.body).toMatchObject({
            revenueCents: 750,
            itemsSoldCount: 3,
            avgItemsPerOrder: 3,
            paymentCount: 1,
            unpaidBillCount: 0,
            topSellingItems: [{ _id: ITEM._id, name: "Kuy Teav", quantity: 3 }],
            from: null,
            to: null,
        });
        expect(after.body).not.toHaveProperty("numOfMoneyEarned");
    });

    it("?from=&to= keeps the bills paid in that range", async () => {
        await place("1", 2);
        await payTable();
        const inRange = { from: new Date(Date.now() - 60_000).toISOString(), to: new Date(Date.now() + 60_000).toISOString() };
        const now = await request(app).get("/api/orders/owner/overview").query(inRange).set(owner);
        expect(now.body).toMatchObject({ revenueCents: 500, paymentCount: 1, orderCount: 1, ...inRange });
        const lastYear = await request(app)
            .get(`/api/orders/${R.slug}/overview`)
            .query({ from: "2025-01-01T00:00:00.000Z", to: "2025-02-01T00:00:00.000Z" })
            .set(owner);
        expect(lastYear.body).toMatchObject({ revenueCents: 0, paymentCount: 0, orderCount: 0, tableCount: 4 });
    });

    it("answers 400 for a date that isn't one", async () => {
        const res = await request(app).get("/api/orders/owner/overview").query({ from: "soon" }).set(owner);
        expect(res.status).toBe(400);
    });
});

describe("one open bill per table (VM-08)", () => {
    const bills = async () =>
        (await request(app).get(`/api/orders/${R.slug}/bills`).set(cashier)).body as {
            _id: string;
            table: string;
            isPaid: boolean;
            orders: unknown[];
        }[];
    const setPaid = (id: string, isPaid: boolean) => request(app).patch(`/api/orders/${R.slug}/bills/${id}`).set(cashier).send({ isPaid });

    it("10 orders joining a table's bill at the same moment make exactly 1 open bill", async () => {
        // The bill upsert itself, as placing an order does it, 10 at once: without the unique
        // index, every run made several open bills.
        const orderIds = Array.from({ length: 10 }, () => new mongoose.Types.ObjectId().toString());
        await Promise.all(orderIds.map(async (id) => mongoBillsRepo.attachOrder(await mongoBillsRepo.openBillFor(R._id, "1"), id)));
        const open = await Bill.find({ resId: R._id, table: "1", isPaid: false }).lean();
        expect(open).toHaveLength(1);
        expect(open[0].orders.map(String).sort()).toEqual([...orderIds].sort());
    });

    it("10 orders placed at the same moment end up on exactly 1 open bill", async () => {
        const results = await Promise.all(Array.from({ length: 10 }, () => place("1", 1)));
        expect(results.map((r) => r.status)).toEqual(Array(10).fill(201));
        const open = (await bills()).filter((b) => b.table === "1" && !b.isPaid);
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
        expect((await bills()).filter((b) => !b.isPaid)).toHaveLength(1);
    });

    it("re-opening a paid bill is fine when the table has no other open bill", async () => {
        await place();
        const [first] = await bills();
        await setPaid(first._id, true);
        const res = await setPaid(first._id, false);
        expect(res.status).toBe(200);
        expect(res.body.isPaid).toBe(false);
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
            lines: [{ name: "Kuy Teav", priceCents: 250, quantity: 2, totalCents: 500 }],
            totalCents: 500,
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
        expect(res.body.orders.map((o: { totalCents: number }) => o.totalCents)).toEqual([500, 250]);
        expect(res.body.totalCents).toBe(750);
        expect(JSON.stringify(res.body)).not.toContain(R._id);
    });

    it("once the bill is paid, the table's list is empty again", async () => {
        await place("1");
        const [bill] = (await request(app).get(`/api/orders/${R.slug}/bills`).set(cashier)).body;
        await request(app).patch(`/api/orders/${R.slug}/bills/${bill._id}`).set(cashier).send({ isPaid: true });
        const res = await tableApi("1", "/open-bill");
        expect(res.body).toEqual({ table: "1", orders: [], totalCents: 0, total: 0 });
    });
});

describe("kitchen queue and history (VM-10)", () => {
    const kitchen = (path = "") => request(app).get(`/api/orders/${R.slug}/kitchen${path}`).set(chef);

    it("the queue has pending, preparing and ready orders only, oldest first (the default, and ?status=active)", async () => {
        const a = (await place("1")).body;
        const b = (await place("1")).body; // (the fake menu check only accepts table "1")
        const c = (await place("1")).body;
        await serve(b._id);
        for (const path of ["?status=active", ""]) {
            const res = await kitchen(path);
            expect(res.status).toBe(200);
            expect(res.body.map((o: { _id: string }) => o._id)).toEqual([a._id, c._id]);
        }
        expect((await kitchen("?status=everything")).status).toBe(400);
    });

    it("history: served and cancelled orders, newest first, 20 to a page, with the total", async () => {
        const docs = Array.from({ length: 25 }, (_, i) => ({
            table: "1",
            resId: R._id,
            status: i % 5 ? "served" : "cancelled",
            orderedItems: [{ item: ITEM, quantity: 1 }],
            createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)),
        }));
        await Order.insertMany([...docs, { ...docs[0], status: "ready", createdAt: new Date(Date.UTC(2026, 0, 2)) }]);
        const first = await kitchen("/history?page=1&limit=20");
        expect(first.status).toBe(200);
        expect(first.body).toMatchObject({ page: 1, limit: 20, total: 25, pages: 2 });
        expect(first.body.orders).toHaveLength(20);
        expect(first.body.orders.every((o: { status: string }) => ["served", "cancelled"].includes(o.status))).toBe(true);
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
        expect(names).toContain("resId_1_status_1_createdAt_1"); // VM-27 (was on isDone)
        const many = Array.from({ length: 5000 }, (_, i) => ({
            table: String(i % 30),
            resId: R._id,
            status: i % 1000 ? "served" : "preparing", // 5 still cooking
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
    const pay = (id: string) => request(app).patch(`/api/orders/${R.slug}/bills/${id}`).set(cashier).send({ isPaid: true });

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
                isPaid: true,
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
        expect(first.body.bills.every((b: { isPaid: boolean }) => b.isPaid)).toBe(true);
        const second = await list("?status=paid&page=2");
        expect(second.body.bills.map((b: { table: string }) => b.table)).toEqual(["t2", "t1", "t0"]);
        expect((await list("?status=paid&limit=500")).body.limit).toBe(100);
        expect((await list("?status=paid&page=0")).status).toBe(400);
    });

    it("is backed by an index", async () => {
        const names = (await Bill.listIndexes()).map((i: { name: string }) => i.name);
        expect(names).toContain("resId_1_isPaid_1_updatedAt_-1");
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
        const res = await request(app).patch(`/api/orders/${R.slug}/bills/${bill._id}`).set(cashier).send({ isPaid: "yes" });
        expect(res.status).toBe(400);
        expect(res.body.fields).toEqual({ isPaid: "Must be true or false" });
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

describe("order status over HTTP (VM-27)", () => {
    const step = (id: string, status: string, who = chef) =>
        request(app).patch(`/api/orders/${R.slug}/kitchen/${id}/status`).set(who).send({ status });

    it("the chef steps an order along; a skipped step is 409; the customer's page shows each status", async () => {
        const { body: order } = await place();
        expect(order.status).toBe("pending");
        expect((await step(order._id, "ready")).status).toBe(409);
        expect((await step(order._id, "preparing")).body.status).toBe("preparing");
        expect((await step(order._id, "ready")).body.status).toBe("ready");
        const view = await request(app).get(`/api/orders/${R.slug}/tables/1/orders/${order._id}`);
        expect(view.body.status).toBe("ready");
        expect((await step(order._id, "bogus")).body.fields).toEqual({ status: expect.any(String) });
        expect((await step(order._id, "served", cashier)).status).toBe(403);
    });

    it("the cashier cancels with a reason; the order leaves the kitchen's queue and the bill's total", async () => {
        const { body: kept } = await place("1", 2);
        const { body: dropped } = await place("1", 3);
        const [bill] = (await request(app).get(`/api/orders/${R.slug}/bills`).set(cashier)).body;
        const cancel = (id: string, body: object, who = cashier) =>
            request(app).patch(`/api/orders/${R.slug}/bills/${bill._id}/orders/${id}/cancel`).set(who).send(body);

        expect((await cancel(dropped._id, {})).body.fields).toEqual({ reason: "Required" });
        expect((await cancel(dropped._id, { reason: "x" }, chef)).status).toBe(403);
        const res = await cancel(dropped._id, { reason: "Guest changed their mind" });
        expect(res.body).toMatchObject({ status: "cancelled", cancelReason: "Guest changed their mind" });
        expect((await cancel(dropped._id, { reason: "again" })).status).toBe(409);

        const queue = await request(app).get(`/api/orders/${R.slug}/kitchen`).set(chef);
        expect(queue.body.map((o: { _id: string }) => o._id)).toEqual([kept._id]);
        const open = await request(app).get(`/api/orders/${R.slug}/tables/1/open-bill`);
        expect(open.body.totalCents).toBe(500); // 2 × 2.50; the cancelled 3 aren't charged
    });
});
