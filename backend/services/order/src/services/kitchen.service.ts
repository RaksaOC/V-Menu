import { assertId, badRequest, notFound } from "@vmenu/common";
import type { OrdersRepo } from "../repositories/orders.repo.js";

/** A positive whole number from the query string, or the default when it's missing. */
function whole(value: unknown, fallback: number, name: string) {
    if (value === undefined || value === "") return fallback;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1) throw badRequest(`${name} must be a whole number from 1`);
    return n;
}

/** The kitchen's queue. */
export function kitchenService({ orders }: { orders: OrdersRepo }) {
    return {
        /** What's still to cook, oldest first. Finished orders are never sent (VM-10). */
        queue: (resId: string) => orders.listActive(resId),

        /** Finished orders, newest first, a page at a time (VM-10). */
        async history(resId: string, query: { page?: unknown; limit?: unknown }) {
            const page = whole(query.page, 1, "page");
            const limit = Math.min(whole(query.limit, 20, "limit"), 100);
            const { orders: list, total } = await orders.pageDone(resId, (page - 1) * limit, limit);
            return { orders: list, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
        },

        async markDone(resId: string, id: string) {
            assertId(id, "order id");
            const order = await orders.markDone(resId, id);
            if (!order) throw notFound("Order not found");
            return order;
        },
    };
}
