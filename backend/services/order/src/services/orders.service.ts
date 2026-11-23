import { HttpError, logger, parse } from "@vmenu/common";
import { DateRangeQuery, type OrderLine, type PlaceOrderBody } from "@vmenu/contracts";
import type { BoundClients } from "../clients/index.js";
import type { BillsRepo } from "../repositories/bills.repo.js";
import type { OrderRecord, OrdersRepo } from "../repositories/orders.repo.js";

// VM-23: how many times to try putting a saved order on its bill.
const ATTEMPTS = 3;
const MINUTE = 60_000;
const WEEK = 7 * 24 * 60 * MINUTE;
/** The check leaves the last minute alone: an order placed just now may still be between the two steps. */
const STILL_BEING_PLACED = MINUTE;

const notSaved = () => new HttpError(503, "We couldn't save your order. Please try again.", "ORDER_NOT_SAVED");

/** Customers placing orders. */
/**
 * VM-28: puts each customer note back on its line. menu-service answers line by line, in the order
 * asked; the notes stay here (it has no use for them). Each line's dish is checked, so a note can
 * never land on the wrong dish. Lines are never merged: the same dish with two notes is two lines.
 */
function withNotes(checked: OrderLine[], asked: PlaceOrderBody["orderedItems"]): OrderLine[] {
    const matches = checked.length === asked.length && checked.every((l, i) => String(l.item._id) === String(asked[i].item._id));
    if (!matches) throw new HttpError(502, "The menu's answer didn't match the order. Please try again.", "ORDER_CHECK_MISMATCH");
    return checked.map((line, i) => {
        const note = asked[i].note;
        return note ? { ...line, note } : line;
    });
}

export function ordersService({ orders, bills, clients }: { orders: OrdersRepo; bills: BillsRepo; clients: BoundClients }) {
    /** VM-23: takes back what a failed order left behind. If this fails too, the internal check lists the order. */
    async function undo(resId: string, table: string, orderId?: string) {
        try {
            if (orderId) {
                await bills.detachOrder(resId, orderId); // the failed update may have reached the database
                await orders.remove(resId, orderId);
            }
            await bills.removeEmptyOpen(resId, table);
        } catch (err) {
            logger.error({ err, orderId, table }, "could not undo a failed order");
        }
    }

    return {
        /**
         * menu-service confirms the table is open and supplies the real dishes and prices (the
         * browser's are ignored). VM-23: the bill comes first, then the order with that bill's id,
         * then the order goes on the bill. If that last step keeps failing, the order is taken
         * back and the customer is asked to try again, so the kitchen never cooks an order that
         * the cashier can't charge.
         */
        async place(resId: string, { table, orderedItems, note }: PlaceOrderBody) {
            const { items } = await clients.orderCheck(resId, {
                table,
                items: orderedItems.map((l) => ({ _id: l.item._id, quantity: l.quantity })),
            });
            const lines = withNotes(items, orderedItems);
            let billId: string;
            let order: OrderRecord;
            try {
                billId = await bills.openBillFor(resId, table);
                order = await orders.create({ table, orderedItems: lines, resId, billId, ...(note && { note }) });
            } catch (err) {
                logger.error({ err, table }, "could not save an order");
                await undo(resId, table);
                throw notSaved();
            }
            let billOnOrder = billId;
            for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
                try {
                    if (billId !== billOnOrder) {
                        await orders.setBill(resId, order._id, billId);
                        billOnOrder = billId;
                    }
                    if (await bills.attachOrder(billId, order._id)) {
                        const { billId: _internal, ...answer } = order; // the customer has no use for it
                        return answer;
                    }
                    billId = await bills.openBillFor(resId, table); // the bill was paid just now: use the table's new one
                } catch (err) {
                    logger.warn({ err, orderId: String(order._id), attempt }, "could not put an order on its bill");
                }
            }
            await undo(resId, table, order._id);
            throw notSaved();
        },

        /** VM-23: orders no bill holds, so nobody would charge them. Default: the last 7 days. */
        async withoutBill(query: unknown, now = new Date()) {
            const asked = parse(DateRangeQuery, query ?? {});
            const latest = new Date(now.getTime() - STILL_BEING_PLACED);
            const range = {
                from: asked.from ?? new Date(now.getTime() - WEEK),
                to: asked.to && asked.to < latest ? asked.to : latest,
            };
            const { orders: found, total } = await orders.listWithoutBill(range, 100);
            return { from: range.from.toISOString(), to: range.to.toISOString(), count: total, orders: found };
        },
    };
}
