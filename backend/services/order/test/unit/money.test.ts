import { describe, expect, it } from "vitest";
import { billsService } from "../../src/services/bills.service.js";
import { kitchenService } from "../../src/services/kitchen.service.js";
import { ordersService } from "../../src/services/orders.service.js";
import { statsService } from "../../src/services/stats.service.js";
import { tableService } from "../../src/services/table.service.js";
import { R1, fakeBills, fakeClients, fakeOrders } from "./fakes.js";

// CL-07: totals are added up in whole cents, and every answer gives them in cents.
const AWKWARD = { _id: "665f0000000000000000bbbb", name: "Awkward", priceCents: 235, price: 2.35, image: "a.jpg", isEnabled: true };

function setup() {
    const orders = fakeOrders();
    const bills = fakeBills(orders);
    const clients = fakeClients({
        orderCheck: async (_r, body) => ({ items: body.items.map((l) => ({ item: AWKWARD, quantity: l.quantity })) }),
    });
    return {
        bills,
        placing: ordersService({ orders, bills, clients }),
        kitchen: kitchenService({ orders }),
        billing: billsService({ bills, orders }),
        stats: statsService({ orders, bills, clients }),
        tableView: tableService({ orders, bills }),
    };
}
const line = (quantity: number) => ({ item: { _id: AWKWARD._id }, quantity });

describe("money in cents (CL-07)", () => {
    it("the customer's order has each line and the total in cents", async () => {
        const s = setup();
        const o = await s.placing.place(R1._id, { table: "1", orderedItems: [line(3)] });
        const view = await s.tableView.order(R1._id, "1", String(o._id));
        expect(view.lines).toEqual([expect.objectContaining({ name: "Awkward", priceCents: 235, quantity: 3, totalCents: 705 })]);
        expect(view.totalCents).toBe(705);
    });

    it("the old dollar fields are still sent for one release, worked out from the cents", async () => {
        const s = setup();
        const o = await s.placing.place(R1._id, { table: "1", orderedItems: [line(3)] });
        const view = await s.tableView.order(R1._id, "1", String(o._id));
        expect(view.lines[0]).toMatchObject({ price: 2.35, total: 7.05 });
        expect(view.total).toBe(7.05);
        expect((await s.tableView.openBill(R1._id, "1")).total).toBe(7.05);
    });

    it("the open bill's total is exact, and leaves cancelled orders out", async () => {
        const s = setup();
        await s.placing.place(R1._id, { table: "1", orderedItems: [line(3)] });
        const dropped = await s.placing.place(R1._id, { table: "1", orderedItems: [line(1)] });
        const [bill] = await s.billing.open(R1._id);
        await s.billing.cancelOrder(R1._id, String(bill._id), String(dropped._id), { reason: "x" }, "cashier");
        expect((await s.tableView.openBill(R1._id, "1")).totalCents).toBe(705);
    });

    it("revenue is in cents on both dashboards", async () => {
        const s = setup();
        await s.placing.place(R1._id, { table: "1", orderedItems: [line(3)] });
        await s.billing.setPaid(R1._id, s.bills.all[0]._id, true);
        expect((await s.stats.ownerOverview("owner1")).revenueCents).toBe(705);
        expect((await s.stats.restaurantOverview(R1._id)).revenueCents).toBe(705);
    });
});
