import { PlaceOrderBody } from "@vmenu/contracts";
import { describe, expect, it } from "vitest";
import { HttpError } from "@vmenu/common";
import { ordersService } from "../../src/services/orders.service.js";
import { kitchenService } from "../../src/services/kitchen.service.js";
import { billsService } from "../../src/services/bills.service.js";
import { statsService } from "../../src/services/stats.service.js";
import { tableService } from "../../src/services/table.service.js";
import { DISH, R1, R2, fakeBills, fakeClients, fakeOrders, newId } from "./fakes.js";

// CL-04: the business rules, with in-memory repositories (no MongoDB, no HTTP).
function setup(clientOverrides = {}) {
    const orders = fakeOrders();
    const bills = fakeBills(orders);
    const clients = fakeClients(clientOverrides);
    return {
        orders,
        bills,
        clients,
        placing: ordersService({ orders, bills, clients }),
        kitchen: kitchenService({ orders }),
        billing: billsService({ bills, orders }),
        stats: statsService({ orders, bills, clients }),
        tableView: tableService({ orders, bills }),
    };
}
const status = async (p: Promise<unknown>) => {
    try {
        await p;
        return 0;
    } catch (e) {
        return e instanceof HttpError ? e.status : ((e as { status?: number }).status ?? -1);
    }
};
const line = (quantity = 1, price = 0) => ({ item: { _id: DISH._id, price }, quantity });
/** VM-27: what "done" used to mean: the kitchen takes the order to served, step by step. */
async function serve(kitchen: ReturnType<typeof kitchenService>, resId: string, id: string) {
    let order;
    for (const status of ["preparing", "ready", "served"] as const) order = await kitchen.setStatus(resId, id, { status }, "chef");
    return order!;
}

describe("placing an order", () => {
    it("takes the menu's dish and price, not the browser's", async () => {
        const { placing } = setup();
        // the route parses the body with PlaceOrderBody first (CL-05): trimmed, the browser's price dropped
        const order = await placing.place(R1._id, PlaceOrderBody.parse({ table: " 1 ", orderedItems: [line(2, 0)] }));
        expect(order.table).toBe("1");
        expect(order.orderedItems).toEqual([{ item: DISH, quantity: 2 }]);
    });

    it("groups a table's orders into one open bill, and starts a new one after it's paid", async () => {
        const { placing, bills, billing } = setup();
        const a = await placing.place(R1._id, { table: "1", orderedItems: [line()] });
        const b = await placing.place(R1._id, { table: "1", orderedItems: [line()] });
        await placing.place(R1._id, { table: "2", orderedItems: [line()] });
        expect(bills.all).toHaveLength(2);
        expect(bills.all[0].orders).toEqual([a._id, b._id]);
        await billing.setPaid(R1._id, bills.all[0]._id, true);
        await placing.place(R1._id, { table: "1", orderedItems: [line()] });
        expect(bills.all).toHaveLength(3);
    });

    it("passes on the menu's refusal and saves nothing", async () => {
        const { placing, orders, bills } = setup();
        expect(await status(placing.place(R1._id, { table: "closed", orderedItems: [line()] }))).toBe(409);
        expect(orders.all).toHaveLength(0);
        expect(bills.all).toHaveLength(0);
    });

    it("sends the menu only ids and quantities", async () => {
        let sent: unknown;
        const { placing } = setup({
            orderCheck: async (_r: string, body: { items: { quantity: number }[] }) => {
                sent = body;
                return { items: body.items.map((l) => ({ item: DISH, quantity: l.quantity })) };
            },
        });
        await placing.place(
            R1._id,
            PlaceOrderBody.parse({ table: "1", orderedItems: [{ item: { _id: DISH._id, name: "Free?", price: 0 }, quantity: 3 }] }),
        );
        expect(sent).toEqual({ table: "1", items: [{ _id: DISH._id, quantity: 3 }] });
    });
});

describe("kitchen", () => {
    it("lists the restaurant's orders oldest first, and marks one done", async () => {
        const { placing, kitchen } = setup();
        const first = await placing.place(R1._id, { table: "1", orderedItems: [line()] });
        await placing.place(R1._id, { table: "2", orderedItems: [line()] });
        await placing.place(R2._id, { table: "9", orderedItems: [line()] });
        const queue = await kitchen.queue(R1._id);
        expect(queue.map((o) => o.table)).toEqual(["1", "2"]);
        expect((await serve(kitchen, R1._id, first._id)).status).toBe("served");
    });

    it("refuses a bad id, an unknown order and another restaurant's order", async () => {
        const { placing, kitchen } = setup();
        const other = await placing.place(R2._id, { table: "9", orderedItems: [line()] });
        expect(await status(kitchen.setStatus(R1._id, "nope", { status: "preparing" }, "chef"))).toBe(400);
        expect(await status(kitchen.setStatus(R1._id, newId(), { status: "preparing" }, "chef"))).toBe(404);
        expect(await status(kitchen.setStatus(R1._id, other._id, { status: "preparing" }, "chef"))).toBe(404);
    });
});

describe("kitchen history (VM-10)", () => {
    it("pages finished orders newest first, 20 by default and at most 100", async () => {
        const { placing, kitchen } = setup();
        for (let i = 0; i < 23; i++) {
            const o = await placing.place(R1._id, { table: String(i), orderedItems: [line()] });
            await serve(kitchen, R1._id, o._id);
        }
        await placing.place(R1._id, { table: "cooking", orderedItems: [line()] });
        const first = await kitchen.history(R1._id, {});
        expect(first).toMatchObject({ page: 1, limit: 20, total: 23, pages: 2 });
        expect(first.orders.map((o) => o.table).slice(0, 2)).toEqual(["22", "21"]);
        const second = await kitchen.history(R1._id, { page: "2" });
        expect(second.orders.map((o) => o.table)).toEqual(["2", "1", "0"]);
        expect((await kitchen.history(R1._id, { limit: "1000" })).limit).toBe(100);
        expect((await kitchen.history(R1._id, { page: "9" })).orders).toEqual([]);
        expect(await status(kitchen.history(R1._id, { page: "0" }))).toBe(400);
        expect(await status(kitchen.history(R1._id, { limit: "-3" }))).toBe(400);
        expect(await status(kitchen.history(R1._id, { page: "1.5" }))).toBe(400);
    });

    it("the queue never has finished orders", async () => {
        const { placing, kitchen } = setup();
        const o = await placing.place(R1._id, { table: "1", orderedItems: [line()] });
        await placing.place(R1._id, { table: "2", orderedItems: [line()] });
        await serve(kitchen, R1._id, o._id);
        expect((await kitchen.queue(R1._id)).map((x) => x.table)).toEqual(["2"]);
    });
});

describe("cashier bills (VM-11)", () => {
    it("open: open bills only, newest first", async () => {
        const { placing, billing, bills } = setup();
        await placing.place(R1._id, { table: "1", orderedItems: [line()] });
        await placing.place(R1._id, { table: "2", orderedItems: [line()] });
        await placing.place(R1._id, { table: "3", orderedItems: [line()] });
        await billing.setPaid(R1._id, bills.all[1]._id, true);
        expect((await billing.open(R1._id)).map((b) => b.table)).toEqual(["3", "1"]);
        expect(await billing.open(R2._id)).toEqual([]);
    });

    it("paid: most recently paid first, a page at a time", async () => {
        const { placing, billing, bills } = setup();
        for (let i = 0; i < 23; i++) await placing.place(R1._id, { table: String(i), orderedItems: [line()] });
        for (const b of [...bills.all]) await billing.setPaid(R1._id, b._id, true);
        await placing.place(R1._id, { table: "open", orderedItems: [line()] });
        const first = await billing.paid(R1._id, {});
        expect(first).toMatchObject({ page: 1, limit: 20, total: 23, pages: 2 });
        expect(first.bills[0].table).toBe("22");
        expect((await billing.paid(R1._id, { page: "2" })).bills.map((b) => b.table)).toEqual(["2", "1", "0"]);
        expect((await billing.paid(R1._id, { limit: "999" })).limit).toBe(100);
        expect(await status(billing.paid(R1._id, { page: "0" }))).toBe(400);
        expect(await status(billing.paid(R1._id, { limit: "x" }))).toBe(400);
    });
});

describe("bills", () => {
    it("lists newest first with their orders, and marks paid or unpaid", async () => {
        const { placing, billing } = setup();
        await placing.place(R1._id, { table: "1", orderedItems: [line()] });
        await placing.place(R1._id, { table: "2", orderedItems: [line()] });
        const list = await billing.open(R1._id);
        expect(list.map((b) => b.table)).toEqual(["2", "1"]);
        expect(list[0].orders[0].orderedItems[0].item.name).toBe(DISH.name);
        const paid = await billing.setPaid(R1._id, list[0]._id, true);
        expect(paid.isPaid).toBe(true);
        expect((await billing.setPaid(R1._id, list[0]._id, false)).isPaid).toBe(false);
    });

    it("needs true or false, a valid id, and this restaurant's bill", async () => {
        const { placing, billing, bills } = setup();
        await placing.place(R2._id, { table: "9", orderedItems: [line()] });
        const other = bills.all[0]._id;
        expect(await status(billing.setPaid(R1._id, other, "yes" as unknown as boolean))).toBe(400);
        expect(await status(billing.setPaid(R1._id, "nope", true))).toBe(400);
        expect(await status(billing.setPaid(R1._id, other, true))).toBe(404);
    });
});

describe("one open bill per table (VM-08)", () => {
    it("won't re-open a paid bill while the table has another open bill", async () => {
        const { placing, billing, bills } = setup();
        await placing.place(R1._id, { table: "1", orderedItems: [line()] });
        const first = bills.all[0]._id;
        await billing.setPaid(R1._id, first, true);
        await placing.place(R1._id, { table: "1", orderedItems: [line()] });
        expect(await status(billing.setPaid(R1._id, first, false))).toBe(409);
        expect(bills.all.filter((b) => !b.isPaid)).toHaveLength(1);
    });

    it("re-opens it when the table has no other open bill, and marking an open bill unpaid again is harmless", async () => {
        const { placing, billing, bills } = setup();
        await placing.place(R1._id, { table: "1", orderedItems: [line()] });
        const first = bills.all[0]._id;
        expect((await billing.setPaid(R1._id, first, false)).isPaid).toBe(false); // already open
        await billing.setPaid(R1._id, first, true);
        expect((await billing.setPaid(R1._id, first, false)).isPaid).toBe(false);
    });
});

describe("what the customer sees (VM-07)", () => {
    it("an order at its table, with its number, lines and total", async () => {
        const { placing, tableView } = setup();
        const o = await placing.place(R1._id, { table: "1", orderedItems: [line(3)] });
        const view = await tableView.order(R1._id, "1", o._id);
        expect(view).toMatchObject({
            number: o._id.slice(-6).toUpperCase(),
            table: "1",
            total: 7.5,
            lines: [{ name: DISH.name, price: 2.5, quantity: 3, total: 7.5 }],
        });
        expect(view.placedAt).toEqual(o.orderedAt);
        expect(await status(tableView.order(R1._id, "2", o._id))).toBe(404);
        expect(await status(tableView.order(R2._id, "1", o._id))).toBe(404);
        expect(await status(tableView.order(R1._id, "1", "bad"))).toBe(400);
    });

    it("the open bill of one table, and an empty one when there is none", async () => {
        const { placing, tableView, billing, bills } = setup();
        await placing.place(R1._id, { table: "1", orderedItems: [line(1)] });
        await placing.place(R1._id, { table: "1", orderedItems: [line(2)] });
        await placing.place(R1._id, { table: "2", orderedItems: [line(5)] });
        const bill = await tableView.openBill(R1._id, "1");
        expect(bill.orders.map((o) => o.total)).toEqual([2.5, 5]);
        expect(bill.total).toBe(7.5);
        await billing.setPaid(R1._id, bills.all[0]._id, true);
        expect(await tableView.openBill(R1._id, "1")).toEqual({ table: "1", orders: [], total: 0 });
        expect(await tableView.openBill(R1._id, "x".repeat(41))).toEqual({ table: "x".repeat(41), orders: [], total: 0 });
    });

    it("rounds money to cents", async () => {
        const { placing, tableView } = setup({
            orderCheck: async (_r: string, body: { items: { quantity: number }[] }) => ({
                items: body.items.map((l) => ({ item: { ...DISH, price: 0.1 }, quantity: l.quantity })),
            }),
        });
        const o = await placing.place(R1._id, { table: "1", orderedItems: [line(3)] });
        expect((await tableView.order(R1._id, "1", o._id)).total).toBe(0.3);
    });
});

describe("dashboard numbers", () => {
    async function busyDay() {
        const s = setup();
        const done = async (resId: string, table: string, quantity: number) => {
            const o = await s.placing.place(resId, { table, orderedItems: [line(quantity)] });
            await serve(s.kitchen, resId, o._id);
            return o;
        };
        await done(R1._id, "1", 2);
        await done(R2._id, "5", 3);
        await s.placing.place(R1._id, { table: "2", orderedItems: [line(4)] }); // not done yet: not earned
        await s.billing.setPaid(R1._id, s.bills.all[0]._id, true);
        return s;
    }

    it("one restaurant: the six numbers the cashier and owner see", async () => {
        const { stats } = await busyDay();
        expect(await stats.restaurantOverview(R1._id)).toEqual({
            numOfTables: 4,
            numOfActiveTables: 2,
            numOfItems: 10,
            numOfOrders: 2,
            numOfUnpaidOrders: 1,
            numOfPayments: 1,
        });
    });

    it("the owner's list of restaurants, each with its numbers", async () => {
        const { stats } = await busyDay();
        const list = await stats.ownerRestaurants("owner1");
        expect(list.map((r) => [r.resName, r.numOfOrders])).toEqual([
            ["Mee Keav", 2],
            ["Bai Sach", 1],
        ]);
        expect(await stats.ownerRestaurants("someone-else")).toEqual([]);
    });

    it("the owner's totals: money and items from finished orders only, top sellers, average", async () => {
        const { stats } = await busyDay();
        const o = await stats.ownerOverview("owner1");
        expect(o.numOfOrders).toBe(3);
        expect(o.numOfMoneyEarned).toBe(12.5); // (2 + 3) x 2.50; the unfinished order isn't counted
        expect(o.totalItemsSold).toBe(5);
        expect(o.avgItemsPerOrder).toBe(1.67);
        expect(o.numOfItems).toBe(20);
        expect(o.numOfPayments).toBe(1);
        expect(o.numOfUnpaidOrders).toBe(2); // Mee Keav table 2 and Bai Sach table 5
        expect(o.topSellingItems).toEqual([{ name: DISH.name, quantity: 5 }]);
    });

    it("the owner's totals with no orders, and lines without a price", async () => {
        const empty = setup();
        expect(await empty.stats.ownerOverview("owner1")).toMatchObject({
            numOfOrders: 0,
            avgItemsPerOrder: 0,
            numOfMoneyEarned: 0,
            topSellingItems: [],
        });

        const free = setup({
            orderCheck: async (_r: string, body: { items: { quantity: number }[] }) => ({
                items: body.items.map((l) => ({ item: { ...DISH, price: 0 }, quantity: l.quantity })),
            }),
        });
        const o = await free.placing.place(R1._id, { table: "1", orderedItems: [line(1)] });
        await serve(free.kitchen, R1._id, o._id);
        expect((await free.stats.ownerOverview("owner1")).totalItemsSold).toBe(0);
    });

    it("ranks the top five sellers", async () => {
        const dishes = ["A", "B", "C", "D", "E", "F"].map((name, i) => ({ ...DISH, _id: newId(), name, price: 1 + i }));
        const s = setup({
            orderCheck: async (_r: string, body: { items: { _id: string; quantity: number }[] }) => ({
                items: body.items.map((l) => ({ item: dishes.find((d) => d._id === l._id)!, quantity: l.quantity })),
            }),
        });
        const o = await s.placing.place(R1._id, {
            table: "1",
            orderedItems: dishes.map((d, i) => ({ item: { _id: d._id }, quantity: i + 1 })),
        });
        await serve(s.kitchen, R1._id, o._id);
        const top = (await s.stats.ownerOverview("owner1")).topSellingItems;
        expect(top.map((t) => t.name)).toEqual(["F", "E", "D", "C", "B"]);
    });
});
