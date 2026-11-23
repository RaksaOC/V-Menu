import { assertId, notFound } from "@vmenu/common";
import type { OrdersRepo } from "../repositories/orders.repo.js";

/** The kitchen's queue. */
export function kitchenService({ orders }: { orders: OrdersRepo }) {
    return {
        queue: (resId: string) => orders.listForKitchen(resId),

        async markDone(resId: string, id: string) {
            assertId(id, "order id");
            const order = await orders.markDone(resId, id);
            if (!order) throw notFound("Order not found");
            return order;
        },
    };
}
