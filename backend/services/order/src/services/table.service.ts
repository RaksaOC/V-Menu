import { assertId, notFound } from "@vmenu/common";
import type { BillsRepo } from "../repositories/bills.repo.js";
import type { OrderRecord, OrdersRepo } from "../repositories/orders.repo.js";
import { billTotals } from "./bill-totals.js";

// VM-07: what a customer at a table may see: their table's orders as the server saved them
// (dishes, the menu's prices, totals). Nothing internal: no restaurant id, no other table.

/** The short number shown to the customer and staff: the last 6 characters of the order id. */
export const orderNumber = (id: string) => String(id).slice(-6).toUpperCase();

function view(order: OrderRecord) {
    // CL-07: whole cents. The old dollar fields are sent for one release, for pages opened before the deploy.
    const lines = order.orderedItems.map((l) => {
        const totalCents = l.item.priceCents * l.quantity;
        return {
            name: l.item.name,
            priceCents: l.item.priceCents,
            quantity: l.quantity,
            totalCents,
            price: l.item.priceCents / 100,
            total: totalCents / 100,
            ...(l.note && { note: l.note }), // VM-28
        };
    });
    const totalCents = lines.reduce((sum, l) => sum + l.totalCents, 0);
    return {
        _id: String(order._id),
        number: orderNumber(String(order._id)),
        status: order.status, // VM-27: the customer's page shows it
        ...(order.cancelReason && { cancelReason: order.cancelReason }),
        ...(order.note && { note: order.note }), // VM-28
        table: order.table,
        placedAt: order.orderedAt,
        lines,
        totalCents,
        total: totalCents / 100,
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
            const orders = bill?.orders ?? [];
            // VM-27: a cancelled order stays on the bill but isn't charged. VM-31: the same totals as the cashier's.
            const totals = billTotals(orders);
            return { table, orders: orders.map(view), ...totals, total: totals.totalCents / 100 };
        },
    };
}
