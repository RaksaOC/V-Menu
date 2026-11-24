import { Router } from "express";
import { requireRole } from "@vmenu/common";
import type { RouteContext } from "./context.js";

/** /api/menu/:slug/tables: the owner sets tables up; the cashier opens and closes them. */
export function tablesRoutes({ services, restaurant }: RouteContext) {
    const r = Router({ mergeParams: true });
    r.get("/tables", requireRole("owner", "cashier"), async (req, res) => {
        res.json(await services.tables.list((await restaurant(req))._id));
    });
    r.post("/tables", requireRole("owner"), async (req, res) => {
        res.status(201).json(await services.tables.create((await restaurant(req))._id, req.body));
    });
    r.put("/tables/:id", requireRole("owner"), async (req, res) => {
        res.json(await services.tables.update((await restaurant(req))._id, String(req.params.id), req.body));
    });
    r.delete("/tables/:id", requireRole("owner"), async (req, res) => {
        res.json(await services.tables.remove((await restaurant(req))._id, String(req.params.id)));
    });
    r.patch("/tables/:id/availability", requireRole("owner", "cashier"), async (req, res) => {
        res.json(await services.tables.setEnabled((await restaurant(req))._id, String(req.params.id), req.body));
    });
    return r;
}
