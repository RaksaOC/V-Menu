import { PlaceOrderBody, type OrderStatus } from "@vmenu/contracts";
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
        await s.placing.place(R1._id, { table: "2", orderedItems: [line(4)] }); // on an open bill: not earned
        await s.billing.setPaid(R1._id, s.bills.all[0]._id, true);
        return s;
    }

    it("one restaurant: its counts, and the revenue from its paid bills (VM-09)", async () => {
        const { stats } = await busyDay();
        expect(await stats.restaurantOverview(R1._id)).toEqual({
            tableCount: 4,
            activeTableCount: 2,
            itemCount: 10,
            orderCount: 2,
            unpaidBillCount: 1,
            paymentCount: 1,
            revenue: 5, // table 1's paid bill: 2 x 2.50
            from: null,
            to: null,
        });
    });

    it("the owner's list of restaurants, each with its numbers", async () => {
        const { stats } = await busyDay();
        const list = await stats.ownerRestaurants("owner1");
        expect(list.map((r) => [r.resName, r.orderCount, r.revenue])).toEqual([
            ["Mee Keav", 2, 5],
            ["Bai Sach", 1, 0],
        ]);
        expect(await stats.ownerRestaurants("someone-else")).toEqual([]);
    });

    it("the owner's totals with no orders, and lines without a price", async () => {
        const empty = setup();
        expect(await empty.stats.ownerOverview("owner1")).toMatchObject({
            orderCount: 0,
            avgItemsPerOrder: 0,
            revenue: 0,
            itemsSoldCount: 0,
            topSellingItems: [],
        });

        const free = setup({
            orderCheck: async (_r: string, body: { items: { quantity: number }[] }) => ({
                items: body.items.map((l) => ({ item: { ...DISH, price: 0 }, quantity: l.quantity })),
            }),
        });
        await free.placing.place(R1._id, { table: "1", orderedItems: [line(1)] });
        await free.billing.setPaid(R1._id, free.bills.all[0]._id, true);
        expect(await free.stats.ownerOverview("owner1")).toMatchObject({ revenue: 0, itemsSoldCount: 1, avgItemsPerOrder: 1 });
    });

    it("ranks the top five sellers", async () => {
        const dishes = ["A", "B", "C", "D", "E", "F"].map((name, i) => ({ ...DISH, _id: newId(), name, price: 1 + i }));
        const s = setup({
            orderCheck: async (_r: string, body: { items: { _id: string; quantity: number }[] }) => ({
                items: body.items.map((l) => ({ item: dishes.find((d) => d._id === l._id)!, quantity: l.quantity })),
            }),
        });
        await s.placing.place(R1._id, {
            table: "1",
            orderedItems: dishes.map((d, i) => ({ item: { _id: d._id }, quantity: i + 1 })),
        });
        await s.billing.setPaid(R1._id, s.bills.all[0]._id, true);
        const top = (await s.stats.ownerOverview("owner1")).topSellingItems;
        expect(top.map((t) => t.name)).toEqual(["F", "E", "D", "C", "B"]);
    });
});

// VM-09: fixed fixtures. Two paid bills, one unpaid, a dish renamed between orders, and two
// different dishes that once shared a name. Revenue comes from paid bills only.
describe("owner revenue and top sellers (VM-09)", () => {
    const at = (day: number) => new Date(Date.UTC(2026, 10, day, 12));
    const KUY = "665f00000000000000000a01"; // renamed from "Kuy Teav" to "Kuy Teav (large)"
    const COFFEE = "665f00000000000000000a02";
    const OTHER_KUY = "665f00000000000000000a03"; // a different dish, also called "Kuy Teav"
    const dish = (_id: string, name: string, price: number) => ({ _id, name, price, image: "x.jpg", isEnabled: true });

    function fixtures() {
        const s = setup();
        const order = (
            _id: string,
            resId: string,
            table: string,
            status: OrderStatus,
            day: number,
            lines: [ReturnType<typeof dish>, number][],
        ) => {
            s.orders.all.push({
                _id,
                resId,
                table,
                status,
                statusHistory: [],
                orderedItems: lines.map(([item, quantity]) => ({ item, quantity })),
                orderedAt: at(day),
                createdAt: at(day),
            });
            return _id;
        };
        const bill = (_id: string, resId: string, table: string, isPaid: boolean, day: number, orders: string[]) =>
            s.bills.all.push({ _id, resId, table, isPaid, orders, createdAt: at(day), updatedAt: at(day) });

        // Mee Keav, table 1, paid on 1 Nov: 2 x 2.50 + 1 x 1.25, and a cancelled order of 4 coffees
        bill("b1", R1._id, "1", true, 1, [
            order("o1", R1._id, "1", "served", 1, [
                [dish(KUY, "Kuy Teav", 2.5), 2],
                [dish(COFFEE, "Iced Coffee", 1.25), 1],
            ]),
            order("o2", R1._id, "1", "cancelled", 1, [[dish(COFFEE, "Iced Coffee", 1.25), 4]]),
        ]);
        // Bai Sach, table 5, paid on 10 Nov. The kitchen never marked it served; it was paid, so it counts.
        bill("b2", R2._id, "5", true, 10, [
            order("o3", R2._id, "5", "ready", 10, [
                [dish(KUY, "Kuy Teav (large)", 3), 1],
                [dish(OTHER_KUY, "Kuy Teav", 4), 4],
            ]),
        ]);
        // Mee Keav, table 2, still open: served, but not paid, so not revenue
        bill("b3", R1._id, "2", false, 12, [order("o4", R1._id, "2", "served", 12, [[dish(KUY, "Kuy Teav (large)", 3), 10]])]);
        return s;
    }

    it("revenue is the lines on paid bills; cancelled orders and open bills count nowhere", async () => {
        const o = await fixtures().stats.ownerOverview("owner1");
        expect(o.revenue).toBe(25.25); // 5 + 1.25 + 3 + 16
        expect(o.itemsSoldCount).toBe(8); // 2 + 1 + 1 + 4
        expect(o.avgItemsPerOrder).toBe(4); // 8 items on the 2 paid, not cancelled orders
        expect(o.orderCount).toBe(3); // o1, o3, o4; the cancelled o2 isn't an order that counts
        expect(o.paymentCount).toBe(2);
        expect(o.unpaidBillCount).toBe(1);
        expect(o.itemCount).toBe(20);
    });

    it("top sellers are grouped by dish id, with the dish's most recent name", async () => {
        const o = await fixtures().stats.ownerOverview("owner1");
        expect(o.topSellingItems).toEqual([
            { _id: OTHER_KUY, name: "Kuy Teav", quantity: 4 },
            { _id: KUY, name: "Kuy Teav (large)", quantity: 3 },
            { _id: COFFEE, name: "Iced Coffee", quantity: 1 },
        ]);
    });

    it("each restaurant's overview has its own revenue", async () => {
        const { stats } = fixtures();
        expect((await stats.restaurantOverview(R1._id)).revenue).toBe(6.25);
        expect((await stats.restaurantOverview(R2._id)).revenue).toBe(19);
    });

    it("a date range keeps the bills paid in it, and the orders placed in it", async () => {
        const { stats } = fixtures();
        const range = { from: "2026-11-05T00:00:00.000Z", to: "2026-11-30T00:00:00.000Z" };
        const o = await stats.ownerOverview("owner1", range);
        expect(o).toMatchObject({ revenue: 19, itemsSoldCount: 5, orderCount: 2, paymentCount: 1, ...range });
        expect(await stats.restaurantOverview(R1._id, range)).toMatchObject({ revenue: 0, orderCount: 1, paymentCount: 0, ...range });
        // open bills are what's open now, whatever the range
        expect(o.unpaidBillCount).toBe(1);
    });

    it("refuses a date that isn't one, and a range that ends before it starts", async () => {
        const { stats } = fixtures();
        expect(await status(stats.ownerOverview("owner1", { from: "yesterday" }))).toBe(400);
        expect(await status(stats.ownerOverview("owner1", { from: "2026-11-10", to: "2026-11-01" }))).toBe(400);
    });
});
