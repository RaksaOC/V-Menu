import { Router } from "express";
import { requireRole, validate } from "@vmenu/common";
import { CategoryBody, ReorderCategoriesBody } from "@vmenu/contracts";
import { withRestaurant, type RouteContext } from "./context.js";

/** /api/menu/:slug/categories (VM-25): the owner arranges the menu; the cashier reads it to filter. */
export function categoriesRoutes({ services, restaurant }: RouteContext) {
    const r = Router({ mergeParams: true });
    const place = withRestaurant({ restaurant });
    r.get("/categories", requireRole("owner", "cashier"), place, async (_req, res) => {
        res.json(await services.categories.list(res.locals.restaurant._id));
    });
    r.post("/categories", requireRole("owner"), place, validate(CategoryBody), async (req, res) => {
        res.status(201).json(await services.categories.create(res.locals.restaurant._id, req.body));
    });
    // before /:id, so "order" isn't read as an id
    r.put("/categories/order", requireRole("owner"), place, validate(ReorderCategoriesBody), async (req, res) => {
        res.json(await services.categories.reorder(res.locals.restaurant._id, req.body));
    });
    r.put("/categories/:id", requireRole("owner"), place, validate(CategoryBody), async (req, res) => {
        res.json(await services.categories.rename(res.locals.restaurant._id, String(req.params.id), req.body));
    });
    r.delete("/categories/:id", requireRole("owner"), place, async (req, res) => {
        res.json(await services.categories.remove(res.locals.restaurant._id, String(req.params.id)));
    });
    return r;
}
