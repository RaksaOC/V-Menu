// CL-04: the business rules, with in-memory repositories (no MongoDB, no HTTP).
import { describe, expect, it } from "vitest";
import { DISH, R1, R2, newId } from "./fakes.js";
import { line, serve, setup, status } from "./services-setup.js";

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
        await billing.setPaid(R1._id, bills.all[1]!._id, true);
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
        expect(first.bills[0]!.table).toBe("22");
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
        expect(list[0]!.orders[0]!.orderedItems[0]!.item.name).toBe(DISH.name);
        const paid = await billing.setPaid(R1._id, list[0]!._id, true);
        expect(paid.isPaid).toBe(true);
        expect((await billing.setPaid(R1._id, list[0]!._id, false)).isPaid).toBe(false);
    });

    it("needs true or false, a valid id, and this restaurant's bill", async () => {
        const { placing, billing, bills } = setup();
        await placing.place(R2._id, { table: "9", orderedItems: [line()] });
        const other = bills.all[0]!._id;
        expect(await status(billing.setPaid(R1._id, other, "yes" as unknown as boolean))).toBe(400);
        expect(await status(billing.setPaid(R1._id, "nope", true))).toBe(400);
        expect(await status(billing.setPaid(R1._id, other, true))).toBe(404);
    });
});

describe("one open bill per table (VM-08)", () => {
    it("won't re-open a paid bill while the table has another open bill", async () => {
        const { placing, billing, bills } = setup();
        await placing.place(R1._id, { table: "1", orderedItems: [line()] });
        const first = bills.all[0]!._id;
        await billing.setPaid(R1._id, first, true);
        await placing.place(R1._id, { table: "1", orderedItems: [line()] });
        expect(await status(billing.setPaid(R1._id, first, false))).toBe(409);
        expect(bills.all.filter((b) => !b.isPaid)).toHaveLength(1);
    });

    it("re-opens it when the table has no other open bill, and marking an open bill unpaid again is harmless", async () => {
        const { placing, billing, bills } = setup();
        await placing.place(R1._id, { table: "1", orderedItems: [line()] });
        const first = bills.all[0]!._id;
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
            totalCents: 750,
            total: 7.5, // CL-07: the old dollar fields, for one release
            lines: [{ name: DISH.name, priceCents: 250, quantity: 3, totalCents: 750, price: 2.5, total: 7.5 }],
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
        expect(bill.orders.map((o) => o.totalCents)).toEqual([250, 500]);
        expect(bill.totalCents).toBe(750);
        await billing.setPaid(R1._id, bills.all[0]!._id, true);
        expect(await tableView.openBill(R1._id, "1")).toEqual({
            table: "1",
            orders: [],
            lines: [],
            subtotalCents: 0,
            totalCents: 0,
            total: 0,
        });
        expect(await tableView.openBill(R1._id, "x".repeat(41))).toEqual({
            table: "x".repeat(41),
            orders: [],
            lines: [],
            subtotalCents: 0,
            totalCents: 0,
            total: 0,
        });
    });

    it("rounds money to cents", async () => {
        const { placing, tableView } = setup({
            orderCheck: async (_r: string, body: { items: { quantity: number }[] }) => ({
                items: body.items.map((l) => ({ item: { ...DISH, priceCents: 10 }, quantity: l.quantity })),
            }),
        });
        const o = await placing.place(R1._id, { table: "1", orderedItems: [line(3)] });
        expect((await tableView.order(R1._id, "1", o._id)).totalCents).toBe(30);
    });
});
