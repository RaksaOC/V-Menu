import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, cashier, ITEM, owner, place, R, serve, useOrderDb } from "./order-app.js";

useOrderDb();

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
