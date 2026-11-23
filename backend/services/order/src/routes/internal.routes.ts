import { Router } from "express";
import { requireInternal } from "@vmenu/common";
import type { RouteContext } from "./context.js";

/** /internal: for people and scripts inside the network, with the internal key. */
export function internalRoutes({ services }: Pick<RouteContext, "services">) {
    const r = Router();
    r.use(requireInternal);
    // VM-23: orders that are on no bill. ?from=&to= picks a period; the default is the last 7 days.
    r.get("/orders/without-bill", async (req, res) => {
        res.json(await services(req).orders.withoutBill(req.query));
    });
    return r;
}
