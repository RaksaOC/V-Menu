import { Router } from "express";
import type { RouteContext } from "./context.js";

/** /api/restaurants/:slug/public: what a customer may see about a restaurant (VM-21). No sign-in. */
export function publicRoutes({ services }: RouteContext) {
    const r = Router();
    r.get("/restaurants/:slug/public", async (req, res) => {
        res.json(await services.restaurants.publicInfo(String(req.params.slug)));
    });
    return r;
}
