import { assertId, badRequest, HttpError, notFound } from "@vmenu/common";
import type { CancelOrderBody } from "@vmenu/contracts";
import { countOrderStatus } from "../lib/order-metrics.js";
import { OpenBillExists, type BillsRepo } from "../repositories/bills.repo.js";
import type { OrdersRepo } from "../repositories/orders.repo.js";
import { withTotals } from "./bill-totals.js";
import { pages, paging } from "./paging.js";

/** The cashier's bills, one per table visit. */
export function billsService({ bills, orders }: { bills: BillsRepo; orders: OrdersRepo }) {
    return {
        /** What the cashier works on: the open bills, newest first (VM-11). */
        open: async (resId: string) => (await bills.listOpen(resId)).map(withTotals),

        /** Paid bills, most recently paid first, a page at a time (VM-11). */
        async paid(resId: string, query: { page?: unknown; limit?: unknown }) {
            const { page, limit, skip } = paging(query);
            const { bills: list, total } = await bills.pagePaid(resId, skip, limit);
            return { bills: list.map(withTotals), page, limit, total, pages: pages(total, limit) };
        },

        /** VM-27: the cashier cancels an order on an open bill, with a reason. It stays on the bill,
         *  struck through, and isn't charged or counted. */
        async cancelOrder(resId: string, billId: string, orderId: string, { reason }: CancelOrderBody, by: string) {
            assertId(billId, "bill id");
            assertId(orderId, "order id");
            const bill = await bills.get(resId, billId);
            const order = bill?.orders.find((o) => String(o._id) === orderId);
            if (!bill || !order) throw notFound("Order not found on this bill");
            if (bill.isPaid) throw new HttpError(409, "This bill is paid; its orders can't be cancelled", "BILL_PAID");
            if (order.status === "cancelled") throw new HttpError(409, "This order is already cancelled", "ORDER_CANCELLED");
            const cancelled = await orders.setStatus(
                resId,
                orderId,
                order.status,
                "cancelled",
                { at: new Date(), by },
                { cancelReason: reason },
            );
            if (!cancelled) throw new HttpError(409, "The order changed just now; try again", "ORDER_STATUS_STEP");
            countOrderStatus("cancelled"); // B10
            return cancelled;
        },

        async setPaid(resId: string, id: string, isPaid: boolean) {
            assertId(id, "bill id");
            if (typeof isPaid !== "boolean") throw badRequest("isPaid must be true or false");
            // VM-08: re-opening a paid bill would give the table two open bills if it has a new one.
            const tableHasOpenBill = () =>
                new HttpError(409, "This table already has an open bill. Add to that one instead.", "TABLE_HAS_OPEN_BILL");
            if (!isPaid) {
                const current = await bills.get(resId, id);
                if (!current) throw notFound("Bill not found");
                if (current.isPaid) {
                    await bills.removeEmptyOpen(resId, current.table); // VM-23: an empty bill has nothing to protect
                    if (await bills.hasOtherOpenBill(resId, current.table, id)) throw tableHasOpenBill();
                }
            }
            try {
                const bill = await bills.setPaid(resId, id, isPaid);
                if (!bill) throw notFound("Bill not found");
                return withTotals(bill);
            } catch (err) {
                if (err instanceof OpenBillExists) throw tableHasOpenBill(); // lost a race with a new order
                throw err;
            }
        },
    };
}
