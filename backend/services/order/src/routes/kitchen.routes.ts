import { Router } from "express";
import { badRequest, requireRole } from "@vmenu/common";
import type { RouteContext } from "./context.js";

/** /api/orders/:slug/kitchen: the chef's queue. */
export function kitchenRoutes({ services, restaurant }: RouteContext) {
    const r = Router({ mergeParams: true });
    r.use(requireRole("chef"));
    // ?status=active (the default): what's still to cook. Finished orders are in /history (VM-10).
    r.get("/", async (req, res) => {
        if (req.query.status !== undefined && req.query.status !== "active") throw badRequest("status must be active");
        res.json(await services(req).kitchen.queue((await restaurant(req))._id));
    });
    r.get("/history", async (req, res) => {
        res.json(await services(req).kitchen.history((await restaurant(req))._id, req.query));
    });
    r.patch("/:id/done", async (req, res) => {
        res.json(await services(req).kitchen.markDone((await restaurant(req))._id, String(req.params.id)));
    });
    return r;
}
