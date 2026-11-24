import { assertId, notFound } from "@vmenu/common";
import type { BillsRepo } from "../repositories/bills.repo.js";
import type { OrderRecord, OrdersRepo } from "../repositories/orders.repo.js";

// VM-07: what a customer at a table may see: their table's orders as the server saved them
// (dishes, the menu's prices, totals). Nothing internal: no restaurant id, no other table.

const cents = (n: number) => Math.round(n * 100) / 100;

/** The short number shown to the customer and staff: the last 6 characters of the order id. */
export const orderNumber = (id: string) => String(id).slice(-6).toUpperCase();

function view(order: OrderRecord) {
    const lines = order.orderedItems.map((l) => ({
        name: l.item.name,
        price: l.item.price,
        quantity: l.quantity,
        total: cents(l.item.price * l.quantity),
    }));
    return {
        _id: String(order._id),
        number: orderNumber(String(order._id)),
        table: order.table,
        placedAt: order.orderedAt,
        lines,
        total: cents(lines.reduce((sum, l) => sum + l.total, 0)),
    };
}

export function tableService({ orders, bills }: { orders: OrdersRepo; bills: BillsRepo }) {
    return {
        /** One order, only if it was placed at this table. */
        async order(resId: string, table: string, id: string) {
            assertId(id, "order id");
            const order = await orders.get(resId, id);
            if (!order || order.table !== table) throw notFound("Order not found");
            return view(order);
        },

        /** The table's open bill: its orders so far and the running total (empty once paid). */
        async openBill(resId: string, table: string) {
            const bill = await bills.findOpen(resId, table);
            const list = (bill?.orders ?? []).map(view);
            return { table, orders: list, total: cents(list.reduce((sum, o) => sum + o.total, 0)) };
        },
    };
}
