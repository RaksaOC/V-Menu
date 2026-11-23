import { Router } from "express";
import type { RouteContext } from "./context.js";

/** /api/menu/:slug/public: what a customer at a table sees. No sign-in. */
export function publicRoutes({ services, publicRestaurant }: RouteContext) {
    const r = Router({ mergeParams: true });
    r.get("/public/items", async (req, res) => {
        res.json(await services.items.publicMenu((await publicRestaurant(req))._id)); // VM-25: by category
    });
    r.get("/public/tables/:name", async (req, res) => {
        res.json(await services.tables.check((await publicRestaurant(req))._id, String(req.params.name)));
    });
    // SEC-04: the table's own link
    r.get("/public/t/:token", async (req, res) => {
        res.json(await services.tables.openByToken((await publicRestaurant(req))._id, String(req.params.token)));
    });
    return r;
}
