import { Router } from "express";
import { parse } from "@vmenu/common";
import { PlaceOrderBody } from "@vmenu/contracts";
import type { RouteContext } from "./context.js";
import { orderLimiters, type OrderLimits } from "./order-limits.js";

/** POST /api/orders/:slug: a customer places an order (no sign-in). */
export function ordersRoutes({ services, restaurant }: RouteContext, limits: OrderLimits) {
    const r = Router({ mergeParams: true });
    r.post("/", ...orderLimiters(limits), async (req, res) => {
        const place = await restaurant(req);
        const order = await services(req).orders.place(place._id, parse(PlaceOrderBody, req.body ?? {})); // restaurant first, then the body (CL-05)
        req.log.info(
            { orderId: String(order._id), restaurant: place.slug, table: order.table, lines: order.orderedItems.length },
            "order placed",
        );
        res.status(201).json(order);
    });
    return r;
}
