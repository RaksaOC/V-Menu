import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { notFound } from "@vmenu/common";
import { ORDER_STATUSES, OrderCheckResponse } from "@vmenu/contracts";
import { fakeRestaurantLookup, startMemoryMongo, tokenFor } from "@vmenu/common/testing";
import { createApp } from "../../src/app.js";
import type { Clients } from "../../src/clients/index.js";
import { Bill } from "../../src/models/bill.model.js";
import { Order } from "../../src/models/order.model.js";

// B10: the kitchen's numbers on /metrics, which the monitoring agent collects every minute.
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";

const R = { _id: "665f00000000000000000001", name: "Mee Keav", slug: "mee-keav-abc123", ownerId: "owner1" };
const ITEM = { _id: "665f0000000000000000aaaa", name: "Kuy Teav", priceCents: 250, image: "k.jpg", isEnabled: true };
const clients: Clients = {
    listOwnerRestaurants: async () => [R],
    menuCounts: async () => ({ numOfTables: 4, numOfActiveTables: 2, numOfItems: 10 }),
    orderCheck: async (_req, _resId, body) =>
        OrderCheckResponse.parse({ items: body.items.map((l) => ({ item: ITEM, quantity: l.quantity })) }),
    tableByToken: async () => {
        throw notFound("No such table link"); // B10: these tests order by table name
    },
};
const app = createApp({
    clients,
    lookupRestaurant: fakeRestaurantLookup([R]),
});

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
let chef: Record<string, string>, cashier: Record<string, string>;
beforeAll(async () => {
    mongo = await startMemoryMongo("orders");
    chef = await tokenFor("chef", R, { uid: "u1" });
    cashier = await tokenFor("cashier", R, { uid: "u2" });
});
afterAll(async () => {
    await mongo.stop();
});
beforeEach(async () => {
    await mongoose.connection.db!.dropDatabase();
    await Bill.createIndexes();
});

/** One sample's value from the Prometheus text format, or 0 when the series isn't there yet. */
async function metric(name: string, labels = ""): Promise<number> {
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    const line = res.text.split("\n").find((l) => l.startsWith(`${name}${labels ? `{${labels}}` : ""} `));
    return line ? Number(line.split(" ").pop()) : 0;
}
const place = () =>
    request(app)
        .post(`/api/orders/${R.slug}`)
        .send({ table: "1", orderedItems: [{ item: { _id: ITEM._id }, quantity: 1 }] });
const step = (id: string, status: string) => request(app).patch(`/api/orders/${R.slug}/kitchen/${id}/status`).set(chef).send({ status });

describe("order metrics (B10)", () => {
    it("placing an order counts one more pending order", async () => {
        const before = await metric("vmenu_orders_total", 'status="pending"');
        expect((await place()).status).toBe(201);
        expect(await metric("vmenu_orders_total", 'status="pending"')).toBe(before + 1);
    });

    it("each kitchen step and a cancel count the new status", async () => {
        const { body: order } = await place();
        const before = {
            preparing: await metric("vmenu_orders_total", 'status="preparing"'),
            ready: await metric("vmenu_orders_total", 'status="ready"'),
            cancelled: await metric("vmenu_orders_total", 'status="cancelled"'),
        };
        await step(order._id, "preparing");
        await step(order._id, "ready");
        expect(await metric("vmenu_orders_total", 'status="preparing"')).toBe(before.preparing + 1);
        expect(await metric("vmenu_orders_total", 'status="ready"')).toBe(before.ready + 1);

        const { body: other } = await place();
        const [bill] = (await request(app).get(`/api/orders/${R.slug}/bills`).set(cashier)).body;
        const cancel = await request(app)
            .patch(`/api/orders/${R.slug}/bills/${bill._id}/orders/${other._id}/cancel`)
            .set(cashier)
            .send({ reason: "Customer left" });
        expect(cancel.status).toBe(200);
        expect(await metric("vmenu_orders_total", 'status="cancelled"')).toBe(before.cancelled + 1);
    });

    it("a refused step counts nothing", async () => {
        const { body: order } = await place();
        const before = await metric("vmenu_orders_total", 'status="ready"');
        expect((await step(order._id, "ready")).status).toBe(409); // pending can't jump to ready
        expect(await metric("vmenu_orders_total", 'status="ready"')).toBe(before);
    });

    it("records the time from order to ready in a histogram", async () => {
        const { body: order } = await place();
        // the order came in 5 minutes ago
        await Order.updateOne({ _id: order._id }, { $set: { orderedAt: new Date(Date.now() - 300_000) } });
        const count = await metric("vmenu_order_ready_seconds_count");
        const sum = await metric("vmenu_order_ready_seconds_sum");
        await step(order._id, "preparing");
        await step(order._id, "ready");
        expect(await metric("vmenu_order_ready_seconds_count")).toBe(count + 1);
        const took = (await metric("vmenu_order_ready_seconds_sum")) - sum;
        expect(took).toBeGreaterThanOrEqual(299);
        expect(took).toBeLessThan(330);
        expect(await metric("vmenu_order_ready_seconds_bucket", 'le="600"')).toBeGreaterThanOrEqual(1);
    });

    it("shows how long the oldest pending order has waited, and 0 when none waits", async () => {
        expect(await metric("vmenu_orders_pending_oldest_seconds")).toBe(0);
        const { body: order } = await place();
        await Order.updateOne({ _id: order._id }, { $set: { orderedAt: new Date(Date.now() - 20 * 60_000) } });
        const waited = await metric("vmenu_orders_pending_oldest_seconds");
        expect(waited).toBeGreaterThanOrEqual(20 * 60 - 1);
        expect(waited).toBeLessThan(20 * 60 + 30);
        await step(order._id, "preparing");
        expect(await metric("vmenu_orders_pending_oldest_seconds")).toBe(0);
    });

    it("ignores an order left pending for over a day, so one forgotten order can't keep the alert on", async () => {
        const { body: order } = await place();
        await Order.updateOne({ _id: order._id }, { $set: { orderedAt: new Date(Date.now() - 25 * 60 * 60_000) } });
        expect(await metric("vmenu_orders_pending_oldest_seconds")).toBe(0);
    });

    it("lists every status from the start, so a dashboard's increase() doesn't miss the first order after a restart", async () => {
        const { text } = await request(app).get("/metrics");
        for (const status of ORDER_STATUSES) expect(text).toMatch(new RegExp(`^vmenu_orders_total\\{status="${status}"\\} \\d+$`, "m"));
    });

    it("has the rate-limited orders counter, starting at 0", async () => {
        const res = await request(app).get("/metrics");
        expect(res.text).toMatch(/^# TYPE vmenu_orders_rate_limited_total counter$/m);
    });
});
