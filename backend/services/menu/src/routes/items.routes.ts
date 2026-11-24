import { Router } from "express";
import { requireRole } from "@vmenu/common";
import type { RouteContext } from "./context.js";

/** /api/menu/:slug/items: the owner edits the menu; the cashier switches dishes on and off. */
export function itemsRoutes({ services, restaurant }: RouteContext) {
    const r = Router({ mergeParams: true });
    r.get("/items", requireRole("owner", "cashier"), async (req, res) => {
        res.json(await services.items.list((await restaurant(req))._id));
    });
    r.post("/items", requireRole("owner"), async (req, res) => {
        res.status(201).json(await services.items.create(await restaurant(req), req.body));
    });
    r.put("/items/:id", requireRole("owner"), async (req, res) => {
        res.json(await services.items.update(await restaurant(req), String(req.params.id), req.body));
    });
    r.delete("/items/:id", requireRole("owner"), async (req, res) => {
        res.json(await services.items.remove(await restaurant(req), String(req.params.id)));
    });
    r.patch("/items/:id/availability", requireRole("owner", "cashier"), async (req, res) => {
        res.json(await services.items.setEnabled((await restaurant(req))._id, String(req.params.id), req.body));
    });
    return r;
}
