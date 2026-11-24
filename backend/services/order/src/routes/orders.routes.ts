import { Router } from "express";
import type { RouteContext } from "./context.js";

/** POST /api/orders/:slug: a customer places an order (no sign-in). */
export function ordersRoutes({ services, restaurant }: RouteContext) {
    const r = Router({ mergeParams: true });
    r.post("/", async (req, res) => {
        const place = await restaurant(req);
        const order = await services(req).orders.place(place._id, req.body);
        req.log.info(
            { orderId: String(order._id), restaurant: place.slug, table: order.table, lines: order.orderedItems.length },
            "order placed",
        );
        res.status(201).json(order);
    });
    return r;
}
