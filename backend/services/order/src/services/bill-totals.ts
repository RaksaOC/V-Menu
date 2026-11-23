import type { BillLine } from "@vmenu/contracts";
import type { OrderRecord } from "../repositories/orders.repo.js";

/**
 * VM-31: a bill's lines and totals, in whole cents. This is the one place they're worked out, so
 * the cashier, the invoice, the customer and the owner's revenue always agree.
 * - The same dish at the same price is one line. If its price changed between orders it stays on
 *   two lines, so each quantity is charged what it cost when ordered.
 * - A renamed dish shows its newest name.
 * - Cancelled orders aren't charged (VM-27).
 */
export function billTotals(orders: (OrderRecord | null)[]) {
    const merged = new Map<string, BillLine>();
    for (const order of orders) {
        if (!order || order.status === "cancelled") continue;
        for (const { item, quantity } of order.orderedItems) {
            if (!item) continue;
            const priceCents = item.priceCents ?? 0;
            const key = `${item._id}:${priceCents}`;
            const line = merged.get(key) ?? { _id: String(item._id), name: item.name, priceCents, quantity: 0, totalCents: 0 };
            line.name = item.name;
            line.quantity += quantity;
            line.totalCents += priceCents * quantity;
            merged.set(key, line);
        }
    }
    const lines = [...merged.values()];
    const subtotalCents = lines.reduce((sum, l) => sum + l.totalCents, 0);
    return { lines, subtotalCents, totalCents: subtotalCents }; // no tax or discount yet
}

/** The bill with its lines and totals added. */
export const withTotals = <T extends { orders: (OrderRecord | null)[] }>(bill: T) => ({ ...bill, ...billTotals(bill.orders) });
