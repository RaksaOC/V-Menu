import { assertId, notFound } from "@vmenu/common";
import { pages, paging } from "./paging.js";
import type { OrdersRepo } from "../repositories/orders.repo.js";

/** The kitchen's queue. */
export function kitchenService({ orders }: { orders: OrdersRepo }) {
    return {
        /** What's still to cook, oldest first. Finished orders are never sent (VM-10). */
        queue: (resId: string) => orders.listActive(resId),

        /** Finished orders, newest first, a page at a time (VM-10). */
        async history(resId: string, query: { page?: unknown; limit?: unknown }) {
            const { page, limit, skip } = paging(query);
            const { orders: list, total } = await orders.pageDone(resId, skip, limit);
            return { orders: list, page, limit, total, pages: pages(total, limit) };
        },

        async markDone(resId: string, id: string) {
            assertId(id, "order id");
            const order = await orders.markDone(resId, id);
            if (!order) throw notFound("Order not found");
            return order;
        },
    };
}
