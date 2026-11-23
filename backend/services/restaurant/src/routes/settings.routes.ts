import { Router } from "express";
import type { RouteContext } from "./context.js";

/** /api/restaurants/:slug/settings: how the restaurant shows prices (VM-24). No sign-in: customers need it. */
export function settingsRoutes({ services }: RouteContext) {
    const r = Router();
    r.get("/restaurants/:slug/settings", async (req, res) => {
        res.json(await services.restaurants.settings(String(req.params.slug)));
    });
    return r;
}
