import request from "supertest";
import { describe, expect, it } from "vitest";
import { Order } from "../../src/models/order.model.js";
import { app, cashier, chef, ITEM, owner, place, R, serve, useOrderDb } from "./order-app.js";

useOrderDb();

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
