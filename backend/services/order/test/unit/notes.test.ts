import { describe, expect, it } from "vitest";
import { PlaceOrderBody } from "@vmenu/contracts";
import { billsService } from "../../src/services/bills.service.js";
import { kitchenService } from "../../src/services/kitchen.service.js";
import { ordersService } from "../../src/services/orders.service.js";
import { tableService } from "../../src/services/table.service.js";
import { DISH, R1, fakeBills, fakeClients, fakeOrders } from "./fakes.js";

// VM-28: the customer's notes ("no chilli") are saved with the order, line by line, for the kitchen.
const status = (p: Promise<unknown>) => p.then(() => 200).catch((e: { status?: number }) => e.status ?? 500);

function setup(clients = fakeClients()) {
    const orders = fakeOrders();
    const bills = fakeBills(orders);
    return {
        orders,
        placing: ordersService({ orders, bills, clients }),
        kitchen: kitchenService({ orders }),
        billing: billsService({ bills, orders }),
        tableView: tableService({ orders, bills }),
    };
}
const order = (lines: { note?: string; quantity?: number }[], note?: string) =>
    PlaceOrderBody.parse({
        table: "1",
        orderedItems: lines.map((l) => ({
            item: { _id: DISH._id },
            quantity: l.quantity ?? 1,
            ...(l.note !== undefined && { note: l.note }),
        })),
        ...(note !== undefined && { note }),
    });

describe("order notes (VM-28)", () => {
    it("are saved, trimmed, on their line and on the order", async () => {
        const { placing, orders } = setup();
        const placed = await placing.place(R1._id, order([{ note: "  no   chilli " }, {}], " birthday "));
        expect(placed.note).toBe("birthday");
        expect(placed.orderedItems.map((l) => l.note)).toEqual(["no chilli", undefined]);
        expect(orders.all[0]).toMatchObject({ note: "birthday", orderedItems: [{ note: "no chilli" }, {}] });
        expect("note" in orders.all[0]!.orderedItems[1]!).toBe(false);
    });

    it("the same dish with different notes stays as two lines", async () => {
        const { placing } = setup();
        const placed = await placing.place(R1._id, order([{ note: "no chilli", quantity: 2 }, { note: "extra chilli" }]));
        expect(placed.orderedItems.map((l) => [l.item.name, l.quantity, l.note])).toEqual([
            ["Kuy Teav", 2, "no chilli"],
            ["Kuy Teav", 1, "extra chilli"],
        ]);
    });

    it("the kitchen and the customer's page show them", async () => {
        const { placing, kitchen, tableView } = setup();
        await placing.place(R1._id, order([{ note: "no chilli" }], "birthday"));
        const [queued] = await kitchen.queue(R1._id);
        expect(queued).toMatchObject({ note: "birthday", orderedItems: [{ note: "no chilli" }] });
        const bill = await tableView.openBill(R1._id, "1");
        expect(bill.orders[0]).toMatchObject({ note: "birthday", lines: [{ name: "Kuy Teav", note: "no chilli" }] });
    });

    it("the bill still charges the dish on one line (VM-31): notes don't change the price", async () => {
        const { placing, billing } = setup();
        await placing.place(R1._id, order([{ note: "no chilli" }, { note: "extra chilli" }]));
        const [bill] = await billing.open(R1._id);
        expect(bill!.lines).toEqual([{ _id: DISH._id, name: "Kuy Teav", priceCents: 250, quantity: 2, totalCents: 500 }]);
    });

    it("if the menu's answer doesn't match the lines, nothing is saved", async () => {
        const OTHER = { ...DISH, _id: "665f0000000000000000bbbb", name: "Amok" };
        const shuffled = fakeClients({ orderCheck: async () => ({ items: [{ item: OTHER, quantity: 1 }] }) });
        const { placing, orders } = setup(shuffled);
        expect(await status(placing.place(R1._id, order([{ note: "no chilli" }])))).toBe(502);
        expect(orders.all).toHaveLength(0);
    });
});
