import { Router } from "express";
import { requireInternal } from "@vmenu/common";
import type { RouteContext } from "./context.js";

/** /internal: for menu-service, and for people and scripts inside the network, with the internal key.
 *  The gateway never forwards it. */
export function internalRoutes({ services }: Pick<RouteContext, "services">) {
    const r = Router();
    r.use(requireInternal);
    // VM-15: bills point at a table by its name, so menu-service asks before a rename or delete
    r.get("/restaurants/:resId/tables/:name/open-bill", async (req, res) => {
        res.json(await services(req).table.hasOpenBill(String(req.params.resId), String(req.params.name)));
    });
    // VM-23: orders that are on no bill. ?from=&to= picks a period; the default is the last 7 days.
    r.get("/orders/without-bill", async (req, res) => {
        res.json(await services(req).orders.withoutBill(req.query));
    });
    return r;
}
