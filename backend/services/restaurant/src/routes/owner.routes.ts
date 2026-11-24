import { Router } from "express";
import { requireRole, validate } from "@vmenu/common";
import { CreateRestaurantBody } from "@vmenu/contracts";
import type { RouteContext } from "./context.js";

/** /api: an owner's restaurants and staff. Owners only. */
export function ownerRoutes({ services }: RouteContext) {
    const r = Router();
    r.use(requireRole("owner"));
    r.get("/restaurants", async (req, res) => {
        res.json(await services.restaurants.listOwned(req.user!.uid));
    });
    r.post("/restaurants", validate(CreateRestaurantBody), async (req, res) => {
        res.status(201).json(await services.restaurants.create(req.user!, req.body));
    });
    r.get("/staff", async (req, res) => {
        res.json(await services.staff.overview(req.user!.uid));
    });
    r.get("/restaurants/:slug/staff", async (req, res) => {
        res.json(await services.staff.list(req.user!, String(req.params.slug)));
    });
    r.post("/restaurants/:slug/staff", async (req, res) => {
        res.status(201).json(await services.staff.add(req.user!, String(req.params.slug), req.body));
    });
    r.put("/restaurants/:slug/staff/:id", async (req, res) => {
        res.json(await services.staff.update(req.user!, String(req.params.slug), String(req.params.id), req.body));
    });
    r.delete("/restaurants/:slug/staff/:id", async (req, res) => {
        res.json(await services.staff.remove(req.user!, String(req.params.slug), String(req.params.id)));
    });
    return r;
}
