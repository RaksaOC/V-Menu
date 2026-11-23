import { Router } from "express";
import { requireInternal, validate } from "@vmenu/common";
import { OrderCheckRequest } from "@vmenu/contracts";
import type { RouteContext } from "./context.js";

/** /internal: used by order-service only, with the internal key. */
export function internalRoutes({ services }: RouteContext) {
    const r = Router();
    r.use(requireInternal);
    r.get("/restaurants/:resId/counts", async (req, res) => {
        res.json(await services.internal.counts(String(req.params.resId)));
    });
    r.post("/restaurants/:resId/order-check", validate(OrderCheckRequest), async (req, res) => {
        res.json(await services.internal.orderCheck(String(req.params.resId), req.body));
    });
    r.get("/restaurants/:resId/tables/by-token/:token", async (req, res) => {
        res.json(await services.internal.tableByToken(String(req.params.resId), String(req.params.token))); // SEC-04
    });
    return r;
}
