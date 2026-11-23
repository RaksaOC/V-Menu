import { Router } from "express";
import { badRequest, requireRole } from "@vmenu/common";
import type { RouteContext } from "./context.js";

/** /api/orders/:slug/bills: the cashier's bills. */
export function billsRoutes({ services, restaurant }: RouteContext) {
    const r = Router({ mergeParams: true });
    r.use(requireRole("cashier"));
    // VM-11: ?status=open (the default) for the bills to settle; ?status=paid&page= for history.
    r.get("/", async (req, res) => {
        const resId = (await restaurant(req))._id;
        const status = req.query.status ?? "open";
        if (status === "open") return res.json(await services(req).bills.open(resId));
        if (status === "paid") return res.json(await services(req).bills.paid(resId, req.query));
        throw badRequest("status must be open or paid");
    });
    r.patch("/:id", async (req, res) => {
        res.json(await services(req).bills.setPaid((await restaurant(req))._id, String(req.params.id), req.body?.isPayed));
    });
    return r;
}
