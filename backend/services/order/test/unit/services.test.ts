import { describe, expect, it } from "vitest";
import { HttpError } from "@vmenu/common";
import { ordersService } from "../../src/services/orders.service.js";
import { kitchenService } from "../../src/services/kitchen.service.js";
import { billsService } from "../../src/services/bills.service.js";
import { statsService } from "../../src/services/stats.service.js";
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
        billing: billsService({ bills }),
        stats: statsService({ orders, bills, clients }),
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

describe("placing an order", () => {
    it("takes the menu's dish and price, not the browser's", async () => {
        const { placing } = setup();
        const order = await placing.place(R1._id, { table: " 1 ", orderedItems: [line(2, 0)] });
        expect(order.table).toBe("1");
        expect(order.orderedItems).toEqual([{ item: DISH, quantity: 2 }]);
    });

    it("needs a table and at least one item", async () => {
        const { placing } = setup();
        expect(await status(placing.place(R1._id, { orderedItems: [line()] }))).toBe(400);
        expect(await status(placing.place(R1._id, { table: "1", orderedItems: [] }))).toBe(400);
        expect(await status(placing.place(R1._id, { table: "1" }))).toBe(400);
        expect(await status(placing.place(R1._id, { table: "x".repeat(41), orderedItems: [line()] }))).toBe(400);
        expect(await status(placing.place(R1._id, null))).toBe(400);
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
        await placing.place(R1._id, { table: "1", orderedItems: [{ item: { _id: DISH._id, name: "Free?", price: 0 }, quantity: 3 }] });
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
        expect((await kitchen.markDone(R1._id, first._id)).isDone).toBe(true);
    });

    it("refuses a bad id, an unknown order and another restaurant's order", async () => {
        const { placing, kitchen } = setup();
        const other = await placing.place(R2._id, { table: "9", orderedItems: [line()] });
        expect(await status(kitchen.markDone(R1._id, "nope"))).toBe(400);
        expect(await status(kitchen.markDone(R1._id, newId()))).toBe(404);
        expect(await status(kitchen.markDone(R1._id, other._id))).toBe(404);
    });
});

describe("bills", () => {
    it("lists newest first with their orders, and marks paid or unpaid", async () => {
        const { placing, billing } = setup();
        await placing.place(R1._id, { table: "1", orderedItems: [line()] });
        await placing.place(R1._id, { table: "2", orderedItems: [line()] });
        const list = await billing.list(R1._id);
        expect(list.map((b) => b.table)).toEqual(["2", "1"]);
        expect(list[0].orders[0].orderedItems[0].item.name).toBe(DISH.name);
        const paid = await billing.setPaid(R1._id, list[0]._id, true);
        expect(paid.isPayed).toBe(true);
        expect((await billing.setPaid(R1._id, list[0]._id, false)).isPayed).toBe(false);
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
        expect(bills.all.filter((b) => !b.isPayed)).toHaveLength(1);
    });

    it("re-opens it when the table has no other open bill, and marking an open bill unpaid again is harmless", async () => {
        const { placing, billing, bills } = setup();
        await placing.place(R1._id, { table: "1", orderedItems: [line()] });
        const first = bills.all[0]._id;
        expect((await billing.setPaid(R1._id, first, false)).isPayed).toBe(false); // already open
        await billing.setPaid(R1._id, first, true);
        expect((await billing.setPaid(R1._id, first, false)).isPayed).toBe(false);
    });
});

describe("dashboard numbers", () => {
    async function busyDay() {
        const s = setup();
        const done = async (resId: string, table: string, quantity: number) => {
            const o = await s.placing.place(resId, { table, orderedItems: [line(quantity)] });
            await s.kitchen.markDone(resId, o._id);
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
        await free.kitchen.markDone(R1._id, o._id);
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
        await s.kitchen.markDone(R1._id, o._id);
        const top = (await s.stats.ownerOverview("owner1")).topSellingItems;
        expect(top.map((t) => t.name)).toEqual(["F", "E", "D", "C", "B"]);
    });
});
