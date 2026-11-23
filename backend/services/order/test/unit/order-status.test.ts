import { describe, expect, it } from "vitest";
import type { OrderStatus } from "@vmenu/contracts";
import { billsService } from "../../src/services/bills.service.js";
import { kitchenService } from "../../src/services/kitchen.service.js";
import { ordersService } from "../../src/services/orders.service.js";
import { statsService } from "../../src/services/stats.service.js";
import { tableService } from "../../src/services/table.service.js";
import { DISH, R1, R2, fakeBills, fakeClients, fakeOrders, newId } from "./fakes.js";

// VM-27: an order's status, one step at a time; cancelling; cancelled orders left out of totals.
function setup() {
    const orders = fakeOrders();
    const bills = fakeBills(orders);
    const clients = fakeClients();
    return {
        orders,
        placing: ordersService({ orders, bills, clients }),
        kitchen: kitchenService({ orders }),
        billing: billsService({ bills, orders }),
        stats: statsService({ orders, bills, clients }),
        tableView: tableService({ orders, bills }),
    };
}
type S = ReturnType<typeof setup>;
const place = (s: S, resId = R1._id, quantity = 1) =>
    s.placing.place(resId, { table: "1", orderedItems: [{ item: { _id: DISH._id }, quantity }] });
const failure = (p: Promise<unknown>) =>
    p.then(() => null).catch((e: { status?: number; code?: string }) => ({ status: e.status, code: e.code }));
const PATH: OrderStatus[] = ["pending", "preparing", "ready", "served"];
async function advanceTo(s: S, id: string, to: OrderStatus, resId = R1._id) {
    for (const next of PATH.slice(1, PATH.indexOf(to) + 1)) await s.kitchen.setStatus(resId, id, { status: next }, "chef-1");
}
const openBill = async (s: S, resId = R1._id) => (await s.billing.open(resId))[0];

describe("the kitchen moves an order one step at a time", () => {
    it("pending → preparing → ready → served, each step kept with who and when", async () => {
        const s = setup();
        const order = await place(s);
        expect(order.status).toBe("pending");
        for (const next of PATH.slice(1))
            expect((await s.kitchen.setStatus(R1._id, order._id, { status: next }, "chef-1")).status).toBe(next);
        const { statusHistory } = (await s.orders.get(R1._id, order._id))!;
        expect(statusHistory.map((h) => h.status)).toEqual(PATH);
        expect(statusHistory[1]).toMatchObject({ status: "preparing", by: "chef-1" });
        expect(statusHistory[1].at).toBeInstanceOf(Date);
    });

    it.each([
        ["pending", "ready"],
        ["pending", "served"],
        ["pending", "pending"],
        ["pending", "cancelled"], // cancelling is the cashier's, with a reason
        ["preparing", "pending"],
        ["preparing", "served"],
        ["ready", "preparing"],
        ["served", "ready"],
        ["served", "served"],
    ] as [OrderStatus, OrderStatus][])("refuses %s → %s with 409", async (from, to) => {
        const s = setup();
        const order = await place(s);
        await advanceTo(s, order._id, from);
        expect(await failure(s.kitchen.setStatus(R1._id, order._id, { status: to }, "chef-1"))).toEqual({
            status: 409,
            code: "ORDER_STATUS_STEP",
        });
        expect((await s.orders.get(R1._id, order._id))!.status).toBe(from);
    });

    it("a cancelled order can't move; another restaurant's order is not found; a bad id is a 400", async () => {
        const s = setup();
        const order = await place(s);
        await s.billing.cancelOrder(R1._id, (await openBill(s))._id, order._id, { reason: "Wrong table" }, "cashier-1");
        expect(await failure(s.kitchen.setStatus(R1._id, order._id, { status: "preparing" }, "chef-1"))).toEqual({
            status: 409,
            code: "ORDER_STATUS_STEP",
        });
        const theirs = await place(s, R2._id);
        expect((await failure(s.kitchen.setStatus(R1._id, theirs._id, { status: "preparing" }, "chef-1")))?.status).toBe(404);
        expect((await failure(s.kitchen.setStatus(R1._id, "nope", { status: "preparing" }, "chef-1")))?.status).toBe(400);
    });
});

describe("the cashier cancels an order, with a reason", () => {
    it.each(["pending", "preparing", "ready", "served"] as OrderStatus[])("from %s, keeping the reason and who", async (from) => {
        const s = setup();
        const order = await place(s);
        await advanceTo(s, order._id, from);
        const cancelled = await s.billing.cancelOrder(R1._id, (await openBill(s))._id, order._id, { reason: "Wrong dish" }, "cashier-1");
        expect(cancelled).toMatchObject({ status: "cancelled", cancelReason: "Wrong dish" });
        expect(cancelled.statusHistory.at(-1)).toMatchObject({ status: "cancelled", by: "cashier-1" });
    });

    it("refuses a second time, on a paid bill, an order from another bill, and another restaurant's", async () => {
        const s = setup();
        const order = await place(s);
        const bill = await openBill(s);
        await s.billing.cancelOrder(R1._id, bill._id, order._id, { reason: "x" }, "cashier-1");
        expect(await failure(s.billing.cancelOrder(R1._id, bill._id, order._id, { reason: "x" }, "cashier-1"))).toEqual({
            status: 409,
            code: "ORDER_CANCELLED",
        });

        const kept = await place(s);
        await s.billing.setPaid(R1._id, bill._id, true);
        expect(await failure(s.billing.cancelOrder(R1._id, bill._id, kept._id, { reason: "x" }, "cashier-1"))).toEqual({
            status: 409,
            code: "BILL_PAID",
        });

        const elsewhere = await place(s); // goes on a new open bill
        expect((await failure(s.billing.cancelOrder(R1._id, bill._id, elsewhere._id, { reason: "x" }, "cashier-1")))?.status).toBe(404);
        const theirs = await place(s, R2._id);
        const theirBill = await openBill(s, R2._id);
        expect((await failure(s.billing.cancelOrder(R1._id, theirBill._id, theirs._id, { reason: "x" }, "cashier-1")))?.status).toBe(404);
        expect((await failure(s.billing.cancelOrder(R1._id, newId(), theirs._id, { reason: "x" }, "cashier-1")))?.status).toBe(404);
    });
});

describe("cancelled orders don't count", () => {
    it("not in the customer's bill total, nor the dashboards' orders, items and revenue", async () => {
        const s = setup();
        const kept = await place(s, R1._id, 2);
        const dropped = await place(s, R1._id, 3);
        await advanceTo(s, kept._id, "served");
        await advanceTo(s, dropped._id, "served");
        await s.billing.cancelOrder(R1._id, (await openBill(s))._id, dropped._id, { reason: "Sent back" }, "cashier-1");

        const bill = await s.tableView.openBill(R1._id, "1");
        expect(bill.orders.map((o) => o.status)).toEqual(["served", "cancelled"]);
        expect(bill.total).toBe(2 * DISH.price);

        const owner = await s.stats.ownerOverview("owner1");
        expect(owner).toMatchObject({ numOfOrders: 1, numOfMoneyEarned: 2 * DISH.price, totalItemsSold: 2 });
        expect((await s.stats.restaurantOverview(R1._id)).numOfOrders).toBe(1);
    });

    it("the kitchen's queue is pending, preparing and ready; served and cancelled orders are history", async () => {
        const s = setup();
        const [a, b, c, d, e] = [await place(s), await place(s), await place(s), await place(s), await place(s)];
        await advanceTo(s, b._id, "preparing");
        await advanceTo(s, c._id, "ready");
        await advanceTo(s, d._id, "served");
        await s.billing.cancelOrder(R1._id, (await openBill(s))._id, e._id, { reason: "x" }, "cashier-1");
        expect((await s.kitchen.queue(R1._id)).map((o) => o._id)).toEqual([a._id, b._id, c._id]);
        expect((await s.kitchen.history(R1._id, {})).orders.map((o) => o._id).sort()).toEqual([d._id, e._id].sort());
    });

    it("the customer's view of one order has its status", async () => {
        const s = setup();
        const order = await place(s);
        await advanceTo(s, order._id, "ready");
        expect((await s.tableView.order(R1._id, "1", order._id)).status).toBe("ready");
    });
});
