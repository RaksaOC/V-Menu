import { Router } from "express";
import { requireRole } from "@vmenu/common";
import type { RouteContext } from "./context.js";

/** /api/orders/owner: numbers across all the signed-in owner's restaurants. */
export function ownerRoutes({ services }: Pick<RouteContext, "services">) {
    const r = Router();
    r.use(requireRole("owner"));
    r.get("/restaurants", async (req, res) => {
        res.json(await services(req).stats.ownerRestaurants(req.user!.uid));
    });
    r.get("/overview", async (req, res) => {
        res.json(await services(req).stats.ownerOverview(req.user!.uid));
    });
    return r;
}
