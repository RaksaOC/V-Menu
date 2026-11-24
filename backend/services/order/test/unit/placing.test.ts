// CL-04: the business rules, with in-memory repositories (no MongoDB, no HTTP).
import { PlaceOrderBody, type OrderStatus } from "@vmenu/contracts";
import { describe, expect, it } from "vitest";
import { DISH, R1 } from "./fakes.js";
import { line, setup, status } from "./services-setup.js";

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
        expect(bills.all[0]!.orders).toEqual([a._id, b._id]);
        await billing.setPaid(R1._id, bills.all[0]!._id, true);
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
            PlaceOrderBody.parse({ table: "1", orderedItems: [{ item: { _id: DISH._id, name: "Free?", priceCents: 0 }, quantity: 3 }] }),
        );
        expect(sent).toEqual({ table: "1", items: [{ _id: DISH._id, quantity: 3 }] });
    });
});

// VM-23: the bill comes first, and an order is never left off it.

describe("an order always ends up on a bill (VM-23)", () => {
    it("saves the order with its bill's id, and puts it on that bill", async () => {
        const { placing, orders, bills } = setup();
        const placed = await placing.place(R1._id, { table: "1", orderedItems: [line()] });
        expect(bills.all[0]!.orders).toEqual([placed._id]);
        expect(orders.all[0]!.billId).toBe(bills.all[0]!._id);
    });

    it("doesn't send the bill's id to the customer", async () => {
        const { placing } = setup();
        expect(await placing.place(R1._id, { table: "1", orderedItems: [line()] })).not.toHaveProperty("billId");
    });

    it("the bill update fails once: it's tried again and the order ends up on the bill", async () => {
        const { placing, orders, bills } = setup();
        bills.failUpdates = 1;
        const placed = await placing.place(R1._id, { table: "1", orderedItems: [line()] });
        expect(orders.all.map((o) => o._id)).toEqual([placed._id]);
        expect(bills.all[0]!.orders).toEqual([placed._id]);
    });

    it("the bill update keeps failing: 503, no order saved and no empty bill left", async () => {
        const { placing, orders, bills } = setup();
        bills.failUpdates = 99;
        expect(await status(placing.place(R1._id, { table: "1", orderedItems: [line()] }))).toBe(503);
        expect(orders.all).toHaveLength(0);
        expect(bills.all).toHaveLength(0);
    });

    it("a failure leaves the table's bill and its earlier orders as they were", async () => {
        const { placing, orders, bills } = setup();
        const first = await placing.place(R1._id, { table: "1", orderedItems: [line()] });
        bills.failUpdates = 99;
        expect(await status(placing.place(R1._id, { table: "1", orderedItems: [line()] }))).toBe(503);
        expect(orders.all.map((o) => o._id)).toEqual([first._id]);
        expect(bills.all).toHaveLength(1);
        expect(bills.all[0]!.orders).toEqual([first._id]);
    });

    it("saving the order fails: 503, and the bill just opened for it is removed", async () => {
        const { placing, orders, bills } = setup();
        orders.failCreates = 1;
        expect(await status(placing.place(R1._id, { table: "1", orderedItems: [line()] }))).toBe(503);
        expect(orders.all).toHaveLength(0);
        expect(bills.all).toHaveLength(0);
    });

    it("the cleanup failing too still answers 503, and the check can find the order", async () => {
        const { placing, orders, bills } = setup();
        bills.failUpdates = 99;
        orders.remove = async () => {
            throw new Error("database down");
        };
        expect(await status(placing.place(R1._id, { table: "1", orderedItems: [line()] }))).toBe(503);
        expect(orders.all).toHaveLength(1);
        const report = await placing.withoutBill({}, new Date(Date.UTC(2026, 0, 2)));
        expect(report.orders.map((o) => o._id)).toEqual([orders.all[0]!._id]);
    });

    it("the bill is paid between the two steps: the order joins the table's new bill", async () => {
        const { placing, orders, bills, billing } = setup();
        const first = await placing.place(R1._id, { table: "1", orderedItems: [line()] });
        const paidBill = bills.all[0]!._id;
        const create = orders.create;
        orders.create = async (o) => {
            const saved = await create(o);
            await billing.setPaid(R1._id, paidBill, true); // the cashier, at the wrong moment
            return saved;
        };
        const second = await placing.place(R1._id, { table: "1", orderedItems: [line()] });
        expect(bills.all[0]!.orders).toEqual([first._id]);
        expect(bills.all[1]!.orders).toEqual([second._id]);
        expect(orders.all.find((o) => o._id === second._id)!.billId).toBe(bills.all[1]!._id);
    });

    it("a bill with no orders yet isn't shown or counted, and doesn't block re-opening a paid bill", async () => {
        const { placing, bills, billing, stats } = setup();
        await placing.place(R1._id, { table: "1", orderedItems: [line()] });
        const paid = bills.all[0]!._id;
        await billing.setPaid(R1._id, paid, true);
        await bills.openBillFor(R1._id, "1"); // left behind by a crash between the two steps
        expect(await billing.open(R1._id)).toEqual([]);
        expect((await stats.restaurantOverview(R1._id)).unpaidBillCount).toBe(0);
        expect((await billing.setPaid(R1._id, paid, false)).isPaid).toBe(false);
        expect(bills.all.filter((b) => !b.isPaid).map((b) => b._id)).toEqual([paid]);
    });
});

describe("the check for orders with no bill (VM-23)", () => {
    const NOW = new Date(Date.UTC(2026, 0, 10, 12));
    const ago = (ms: number) => new Date(NOW.getTime() - ms);
    const MINUTE = 60_000;
    const DAY = 24 * 60 * MINUTE;

    function withOrders() {
        const s = setup();
        const add = (_id: string, createdAt: Date, status: OrderStatus = "pending") =>
            s.orders.all.push({
                _id,
                resId: R1._id,
                table: "1",
                status,
                statusHistory: [],
                orderedItems: [],
                orderedAt: createdAt,
                createdAt,
            });
        add("on-bill", ago(2 * DAY));
        s.bills.all.push({ _id: "b1", resId: R1._id, table: "1", isPaid: false, orders: ["on-bill"], createdAt: ago(2 * DAY) });
        add("lost", ago(2 * DAY));
        add("just-placed", ago(30_000)); // may still be between the two steps
        add("cancelled", ago(2 * DAY), "cancelled");
        add("too-old", ago(8 * DAY));
        return s;
    }

    it("reports orders on no bill from the last 7 days, skipping cancelled ones and the last minute", async () => {
        const report = await withOrders().placing.withoutBill({}, NOW);
        expect(report.orders.map((o) => o._id)).toEqual(["lost"]);
        expect(report).toMatchObject({ count: 1, from: ago(7 * DAY).toISOString(), to: ago(MINUTE).toISOString() });
    });

    it("takes a period, and never looks at the last minute", async () => {
        const { placing } = withOrders();
        const all = await placing.withoutBill({ from: ago(30 * DAY).toISOString(), to: NOW.toISOString() }, NOW);
        expect(all.orders.map((o) => o._id)).toEqual(["too-old", "lost"]);
        expect(all.to).toBe(ago(MINUTE).toISOString());
    });

    it("refuses a date that isn't one", async () => {
        expect(await status(withOrders().placing.withoutBill({ from: "soon" }, NOW))).toBe(400);
    });
});
