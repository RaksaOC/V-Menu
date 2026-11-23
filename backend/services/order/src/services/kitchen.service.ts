import { assertId, HttpError, notFound } from "@vmenu/common";
import { NEXT_STATUS, type UpdateOrderStatusBody } from "@vmenu/contracts";
import { pages, paging } from "./paging.js";
import type { OrdersRepo } from "../repositories/orders.repo.js";

/** The kitchen's queue, and an order's steps (VM-27). */
export function kitchenService({ orders }: { orders: OrdersRepo }) {
    return {
        /** What's still to do (pending, preparing, ready), oldest first. Finished orders are never sent (VM-10). */
        queue: (resId: string) => orders.listActive(resId),

        /** Served and cancelled orders, newest first, a page at a time (VM-10). */
        async history(resId: string, query: { page?: unknown; limit?: unknown }) {
            const { page, limit, skip } = paging(query);
            const { orders: list, total } = await orders.pageFinished(resId, skip, limit);
            return { orders: list, page, limit, total, pages: pages(total, limit) };
        },

        /** One step forward: pending → preparing → ready → served. Anything else is a 409. */
        async setStatus(resId: string, id: string, { status }: UpdateOrderStatusBody, by: string) {
            assertId(id, "order id");
            const order = await orders.get(resId, id);
            if (!order) throw notFound("Order not found");
            const refused = () => new HttpError(409, `This order is ${order.status}; it can't go to ${status}`, "ORDER_STATUS_STEP");
            if (NEXT_STATUS[order.status] !== status) throw refused();
            const moved = await orders.setStatus(resId, id, order.status, status, { at: new Date(), by });
            if (!moved) throw refused(); // someone else moved it first
            return moved;
        },
    };
}
