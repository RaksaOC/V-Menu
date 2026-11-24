import { Router } from "express";
import { badRequest, parse, requireRole } from "@vmenu/common";
import { UpdateOrderStatusBody } from "@vmenu/contracts";
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
    // VM-27: one step at a time (was PATCH /:id/done)
    r.patch("/:id/status", async (req, res) => {
        const resId = (await restaurant(req))._id; // access first: 403 before 400
        const body = parse(UpdateOrderStatusBody, req.body ?? {});
        res.json(await services(req).kitchen.setStatus(resId, String(req.params.id), body, req.user!.uid));
    });
    return r;
}
