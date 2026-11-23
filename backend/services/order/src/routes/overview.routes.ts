import { Router } from "express";
import { requireRole } from "@vmenu/common";
import type { RouteContext } from "./context.js";

/** /api/orders/:slug/overview: one restaurant's numbers, for its owner and cashier. */
export function overviewRoutes({ services, restaurant }: RouteContext) {
    const r = Router({ mergeParams: true });
    r.get("/", requireRole("owner", "cashier"), async (req, res) => {
        res.json(await services(req).stats.restaurantOverview((await restaurant(req))._id));
    });
    return r;
}
