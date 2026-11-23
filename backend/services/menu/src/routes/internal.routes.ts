import { Router } from "express";
import { requireInternal } from "@vmenu/common";
import type { RouteContext } from "./context.js";

/** /internal: used by order-service only, with the internal key. */
export function internalRoutes({ services }: RouteContext) {
    const r = Router();
    r.use(requireInternal);
    r.get("/restaurants/:resId/counts", async (req, res) => {
        res.json(await services.internal.counts(String(req.params.resId)));
    });
    r.post("/restaurants/:resId/order-check", async (req, res) => {
        res.json(await services.internal.orderCheck(String(req.params.resId), req.body));
    });
    return r;
}
