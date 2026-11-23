import type { PlaceOrderBody } from "@vmenu/contracts";
import type { BoundClients } from "../clients/index.js";
import { countOrderStatus } from "../lib/metrics.js";
import type { BillsRepo } from "../repositories/bills.repo.js";
import type { OrdersRepo } from "../repositories/orders.repo.js";

/** Customers placing orders. */
export function ordersService({ orders, bills, clients }: { orders: OrdersRepo; bills: BillsRepo; clients: BoundClients }) {
    return {
        /**
         * menu-service confirms the table is open and supplies the real dishes and prices (the
         * browser's are ignored); the order then joins that table's open bill.
         */
        async place(resId: string, { table, orderedItems }: PlaceOrderBody) {
            const { items } = await clients.orderCheck(resId, {
                table,
                items: orderedItems.map((l) => ({ _id: l.item._id, quantity: l.quantity })),
            });
            const order = await orders.create({ table, orderedItems: items, resId });
            await bills.addToOpenBill(resId, table, order._id);
            countOrderStatus("pending"); // B10
            return order;
        },
    };
}
