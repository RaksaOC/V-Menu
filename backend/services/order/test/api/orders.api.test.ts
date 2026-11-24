import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { fakeRestaurantLookup } from "@vmenu/common/testing";
import { createApp } from "../../src/app.js";
import { Bill } from "../../src/models/bill.model.js";
import { Order } from "../../src/models/order.model.js";
import { mongoBillsRepo } from "../../src/repositories/bills.repo.js";
import { mongoOrdersRepo } from "../../src/repositories/orders.repo.js";
import { app, cashier, chef, clients, ITEM, menuDown, place, R, useOrderDb } from "./order-app.js";

useOrderDb();

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
        menuDown();
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
        return createApp({ clients, bills, lookupRestaurant: fakeRestaurantLookup([R]) });
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
        expect(bill!.orders.map(String)).toEqual([res.body._id]);
        expect(String((await Order.findById(res.body._id).lean())!.billId)).toBe(String(bill!._id));
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
                await Bill.updateOne({ _id: paying!._id }, { isPaid: true }); // the cashier, at the wrong moment
                return saved;
            },
        };
        const res = await send(createApp({ clients, orders, lookupRestaurant: fakeRestaurantLookup([R]) }));
        expect(res.status).toBe(201);
        const open = await Bill.findOne({ resId: R._id, isPaid: false }).lean();
        expect(open!.orders.map(String)).toEqual([res.body._id]);
        expect(String((await Order.findById(res.body._id).lean())!.billId)).toBe(String(open!._id));
        expect((await Bill.findById(paying!._id).lean())!.orders.map(String)).toEqual([first._id]);
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

describe("order notes (VM-28)", () => {
    const send = (lineNote: string, note: string) =>
        request(app)
            .post(`/api/orders/${R.slug}`)
            .send({ table: "1", note, orderedItems: [{ item: { _id: ITEM._id }, quantity: 1, note: lineNote }] });

    it("are saved, trimmed, and shown to the kitchen", async () => {
        const res = await send("  no chilli ", " birthday ");
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ note: "birthday", orderedItems: [{ note: "no chilli" }] });
        const kitchen = await request(app).get(`/api/orders/${R.slug}/kitchen`).set(chef);
        expect(kitchen.body[0]).toMatchObject({ note: "birthday", orderedItems: [{ note: "no chilli" }] });
    });

    it("over-long notes get 400 and save nothing", async () => {
        expect((await send("x".repeat(101), "")).status).toBe(400);
        expect((await send("", "y".repeat(201))).status).toBe(400);
        expect((await request(app).get(`/api/orders/${R.slug}/kitchen`).set(chef)).body).toEqual([]);
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
        expect(res.body).toEqual({ table: "1", orders: [], lines: [], subtotalCents: 0, totalCents: 0, total: 0 });
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
