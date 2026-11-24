import { Router } from "express";
import { requireInternal } from "@vmenu/common";
import type { RouteContext } from "./context.js";

/** /internal: used by menu-service only, with the internal key. The gateway never forwards it. */
export function internalRoutes({ services }: RouteContext) {
    const r = Router();
    r.use(requireInternal);
    // VM-15: bills point at a table by its name, so menu-service asks before a rename or delete
    r.get("/restaurants/:resId/tables/:name/open-bill", async (req, res) => {
        res.json(await services(req).table.hasOpenBill(String(req.params.resId), String(req.params.name)));
    });
    return r;
}
