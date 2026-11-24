import { badRequest } from "@vmenu/common";
import type { BoundClients } from "../clients/index.js";
import type { BillsRepo } from "../repositories/bills.repo.js";
import type { OrdersRepo } from "../repositories/orders.repo.js";

const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() && v.trim().length <= max ? v.trim() : null);

/** Customers placing orders. */
export function ordersService({ orders, bills, clients }: { orders: OrdersRepo; bills: BillsRepo; clients: BoundClients }) {
    return {
        /**
         * menu-service confirms the table is open and supplies the real dishes and prices (the
         * browser's are ignored); the order then joins that table's open bill.
         */
        async place(resId: string, input: unknown) {
            const body = (input ?? {}) as { table?: unknown; orderedItems?: unknown };
            const table = text(String(body.table ?? ""), 40);
            const lines = Array.isArray(body.orderedItems) ? (body.orderedItems as { item?: { _id?: unknown }; quantity?: unknown }[]) : [];
            if (!table || lines.length === 0) throw badRequest("A table and at least one item are required");
            const { items } = await clients.orderCheck(resId, {
                table,
                items: lines.map((l) => ({ _id: String(l?.item?._id ?? ""), quantity: Number(l?.quantity) })),
            });
            const order = await orders.create({ table, orderedItems: items, resId });
            await bills.addToOpenBill(resId, table, order._id);
            return order;
        },
    };
}
