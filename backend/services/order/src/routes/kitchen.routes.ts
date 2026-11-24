import { Router } from "express";
import { requireRole } from "@vmenu/common";
import type { RouteContext } from "./context.js";

/** /api/orders/:slug/kitchen: the chef's queue. */
export function kitchenRoutes({ services, restaurant }: RouteContext) {
    const r = Router({ mergeParams: true });
    r.use(requireRole("chef"));
    r.get("/", async (req, res) => {
        res.json(await services(req).kitchen.queue((await restaurant(req))._id));
    });
    r.patch("/:id/done", async (req, res) => {
        res.json(await services(req).kitchen.markDone((await restaurant(req))._id, String(req.params.id)));
    });
    return r;
}
