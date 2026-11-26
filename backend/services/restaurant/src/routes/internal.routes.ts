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
    // SEC-03: every service checks here that a session is still current
    r.get("/sessions/version", async (req, res) => {
        res.json(await services.auth.sessionVersion(req.query));
    });
    r.get("/restaurants", async (req, res) => {
        res.json(await services.restaurants.forOwner(req.query));
    });
    return r;
}
