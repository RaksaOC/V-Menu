import { Router } from "express";
import { requireInternal } from "@vmenu/common";
import type { RouteContext } from "./context.js";

/** /internal: other services resolve restaurants here, with the internal key. */
export function internalRoutes({ services }: RouteContext) {
    const r = Router();
    r.use(requireInternal);
    r.get("/restaurants/by-slug/:slug", async (req, res) => {
        res.json(await services.restaurants.bySlug(String(req.params.slug)));
    });
    r.get("/restaurants", async (req, res) => {
        res.json(await services.restaurants.forOwner(req.query.ownerId));
    });
    return r;
}
