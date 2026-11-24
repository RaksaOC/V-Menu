import { Router } from "express";
import { requireRole } from "@vmenu/common";
import type { RouteContext } from "./context.js";

/** /api/orders/:slug/bills: the cashier's bills. */
export function billsRoutes({ services, restaurant }: RouteContext) {
    const r = Router({ mergeParams: true });
    r.use(requireRole("cashier"));
    r.get("/", async (req, res) => {
        res.json(await services(req).bills.list((await restaurant(req))._id));
    });
    r.patch("/:id", async (req, res) => {
        res.json(await services(req).bills.setPaid((await restaurant(req))._id, String(req.params.id), req.body?.isPayed));
    });
    return r;
}
