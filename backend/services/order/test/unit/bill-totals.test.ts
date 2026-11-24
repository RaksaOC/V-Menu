import { describe, expect, it } from "vitest";
import { billsService } from "../../src/services/bills.service.js";
import { ordersService } from "../../src/services/orders.service.js";
import { statsService } from "../../src/services/stats.service.js";
import { tableService } from "../../src/services/table.service.js";
import { R1, fakeBills, fakeClients, fakeOrders } from "./fakes.js";

// VM-31: the server works out each bill's lines and totals, in whole cents, for every page.
const id = (n: number) => `665f0000000000000000b00${n}`;
const dish = (n: number, name: string, priceCents: number) => ({ _id: id(n), name, priceCents, image: "x.jpg", isEnabled: true });

function setup() {
    const menu = new Map([
        [id(1), dish(1, "Tea", 10)], // $0.10
        [id(2), dish(2, "Water", 20)], // $0.20
        [id(3), dish(3, "Amok", 235)], // $2.35
    ]);
    const orders = fakeOrders();
    const bills = fakeBills(orders);
    const clients = fakeClients({
        orderCheck: async (_r, body) => ({ items: body.items.map((l) => ({ item: menu.get(l._id)!, quantity: l.quantity })) }),
    });
    const placing = ordersService({ orders, bills, clients });
    return {
        menu,
        bills,
        billing: billsService({ bills, orders }),
        stats: statsService({ orders, bills, clients }),
        tableView: tableService({ orders, bills }),
        place: (...lines: [number, number][]) =>
            placing.place(R1._id, { table: "1", orderedItems: lines.map(([n, quantity]) => ({ item: { _id: id(n) }, quantity })) }),
    };
}
const openBill = async (s: ReturnType<typeof setup>) => (await s.billing.open(R1._id))[0];

describe("bill totals (VM-31)", () => {
    it("awkward prices are exact: $0.10 + $0.20 is 30 cents, 3 x $2.35 is 705", async () => {
        const s = setup();
        await s.place([1, 1], [2, 1]);
        expect((await openBill(s)).totalCents).toBe(30);
        const other = setup();
        await other.place([3, 3]);
        expect(await openBill(other)).toMatchObject({ subtotalCents: 705, totalCents: 705 });
    });

    it("merges the same dish across the bill's orders, in the order first ordered", async () => {
        const s = setup();
        await s.place([3, 2], [1, 1]);
        await s.place([3, 1]);
        expect((await openBill(s)).lines).toEqual([
            { _id: id(3), name: "Amok", priceCents: 235, quantity: 3, totalCents: 705 },
            { _id: id(1), name: "Tea", priceCents: 10, quantity: 1, totalCents: 10 },
        ]);
    });

    it("keeps a dish on two lines when its price changed between orders", async () => {
        const s = setup();
        await s.place([3, 1]);
        s.menu.set(id(3), dish(3, "Amok", 300));
        await s.place([3, 2]);
        const bill = await openBill(s);
        expect(bill.lines.map((l) => [l.priceCents, l.quantity, l.totalCents])).toEqual([
            [235, 1, 235],
            [300, 2, 600],
        ]);
        expect(bill.totalCents).toBe(835);
    });

    it("shows a renamed dish under its newest name", async () => {
        const s = setup();
        await s.place([1, 1]);
        s.menu.set(id(1), dish(1, "Green Tea", 10));
        await s.place([1, 1]);
        expect((await openBill(s)).lines).toEqual([{ _id: id(1), name: "Green Tea", priceCents: 10, quantity: 2, totalCents: 20 }]);
    });

    it("leaves cancelled orders out", async () => {
        const s = setup();
        await s.place([3, 1]);
        const dropped = await s.place([1, 5]);
        const bill = await openBill(s);
        await s.billing.cancelOrder(R1._id, String(bill._id), String(dropped._id), { reason: "x" }, "cashier");
        const after = await openBill(s);
        expect(after.lines.map((l) => l.name)).toEqual(["Amok"]);
        expect(after.totalCents).toBe(235);
    });

    it("every bill has them: open, paid history, and the answer to marking it paid", async () => {
        const s = setup();
        await s.place([3, 3]);
        const bill = await openBill(s);
        const marked = await s.billing.setPaid(R1._id, String(bill._id), true);
        expect(marked).toMatchObject({ subtotalCents: 705, totalCents: 705 });
        const history = await s.billing.paid(R1._id, {});
        expect(history.bills[0]).toMatchObject({ subtotalCents: 705, totalCents: 705 });
        expect(history.bills[0].lines).toHaveLength(1);
    });

    it("the customer's open bill has the same lines and total", async () => {
        const s = setup();
        await s.place([3, 2]);
        await s.place([3, 1]);
        const table = await s.tableView.openBill(R1._id, "1");
        expect(table).toMatchObject({ subtotalCents: 705, totalCents: 705, total: 7.05 });
        expect(table.lines).toEqual((await openBill(s)).lines);
    });

    it("a table with no bill has empty lines and zero totals", async () => {
        expect(await setup().tableView.openBill(R1._id, "1")).toEqual({
            table: "1",
            orders: [],
            lines: [],
            subtotalCents: 0,
            totalCents: 0,
            total: 0,
        });
    });

    it("the owner's revenue is the sum of the same bill totals", async () => {
        const s = setup();
        await s.place([3, 3]);
        const bill = await openBill(s);
        const { totalCents } = await s.billing.setPaid(R1._id, String(bill._id), true);
        expect((await s.stats.ownerOverview("owner1")).revenueCents).toBe(totalCents);
    });
});
