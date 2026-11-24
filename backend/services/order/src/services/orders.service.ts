import { HttpError, invalidTableLink, tableNameLinksAllowed } from "@vmenu/common";
import type { PlaceOrderBody } from "@vmenu/contracts";
import type { BoundClients } from "../clients/index.js";
import type { BillsRepo } from "../repositories/bills.repo.js";
import type { OrdersRepo } from "../repositories/orders.repo.js";

/** Customers placing orders. */
export function ordersService({ orders, bills, clients }: { orders: OrdersRepo; bills: BillsRepo; clients: BoundClients }) {
    return {
        /** SEC-04: the table a link token belongs to (menu-service keeps them); 404 if none. */
        tableNameOf: async (resId: string, token: string) => (await clients.tableByToken(resId, token)).name,

        /**
         * menu-service confirms the table is open and supplies the real dishes and prices (the
         * browser's are ignored); the order then joins that table's open bill.
         */
        async place(resId: string, { table: name, qrToken, orderedItems }: PlaceOrderBody) {
            // SEC-04: a table's link token; a name only where that setting is on
            if (!qrToken && !tableNameLinksAllowed()) throw invalidTableLink();
            const checked = await clients.orderCheck(resId, {
                ...(qrToken ? { qrToken } : { table: name }),
                items: orderedItems.map((l) => ({ _id: l.item._id, quantity: l.quantity })),
            });
            const { items } = checked;
            const table = checked.table ?? name;
            if (!table) throw new HttpError(502, "menu-service didn't say which table this is", "UPSTREAM_CONTRACT");
            const order = await orders.create({ table, orderedItems: items, resId });
            await bills.addToOpenBill(resId, table, order._id);
            return order;
        },
    };
}
