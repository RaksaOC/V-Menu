import { Router } from "express";
import { requireRole, validate } from "@vmenu/common";
import { AvailabilityBody, CreateTableBody, UpdateTableBody } from "@vmenu/contracts";
import { withRestaurant, type RouteContext } from "./context.js";

/** /api/menu/:slug/tables: the owner sets tables up; the cashier opens and closes them. */
export function tablesRoutes({ services, restaurant }: RouteContext) {
    const r = Router({ mergeParams: true });
    const place = withRestaurant({ restaurant });
    r.get("/tables", requireRole("owner", "cashier"), place, async (req, res) => {
        res.json(await services.tables.list(res.locals.restaurant._id));
    });
    r.post("/tables", requireRole("owner"), place, validate(CreateTableBody), async (req, res) => {
        res.status(201).json(await services.tables.create(res.locals.restaurant._id, req.body));
    });
    r.put("/tables/:id", requireRole("owner"), place, validate(UpdateTableBody), async (req, res) => {
        res.json(await services.tables.update(res.locals.restaurant._id, String(req.params.id), req.body));
    });
    r.delete("/tables/:id", requireRole("owner"), place, async (req, res) => {
        res.json(await services.tables.remove(res.locals.restaurant._id, String(req.params.id)));
    });
    r.post("/tables/:id/qr-token", requireRole("owner"), place, async (req, res) => {
        res.json(await services.tables.resetQrToken(res.locals.restaurant._id, String(req.params.id))); // SEC-04
    });
    r.patch("/tables/:id/availability", requireRole("owner", "cashier"), place, validate(AvailabilityBody), async (req, res) => {
        res.json(await services.tables.setEnabled(res.locals.restaurant._id, String(req.params.id), req.body.isEnabled));
    });
    return r;
}
