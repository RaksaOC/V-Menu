import { Router } from "express";
import { requireRole, validate } from "@vmenu/common";
import { AvailabilityBody, CreateItemBody, UpdateItemBody } from "@vmenu/contracts";
import { withRestaurant, type RouteContext } from "./context.js";

/** /api/menu/:slug/items: the owner edits the menu; the cashier switches dishes on and off. */
export function itemsRoutes({ services, restaurant }: RouteContext) {
    const r = Router({ mergeParams: true });
    const place = withRestaurant({ restaurant });
    r.get("/items", requireRole("owner", "cashier"), place, async (req, res) => {
        res.json(await services.items.list(res.locals.restaurant._id));
    });
    r.post("/items", requireRole("owner"), place, validate(CreateItemBody), async (req, res) => {
        res.status(201).json(await services.items.create(res.locals.restaurant, req.body));
    });
    r.put("/items/:id", requireRole("owner"), place, validate(UpdateItemBody), async (req, res) => {
        res.json(await services.items.update(res.locals.restaurant, String(req.params.id), req.body));
    });
    r.delete("/items/:id", requireRole("owner"), place, async (req, res) => {
        res.json(await services.items.remove(res.locals.restaurant, String(req.params.id)));
    });
    r.patch("/items/:id/availability", requireRole("owner", "cashier"), place, validate(AvailabilityBody), async (req, res) => {
        res.json(await services.items.setEnabled(res.locals.restaurant._id, String(req.params.id), req.body.isEnabled));
    });
    return r;
}
