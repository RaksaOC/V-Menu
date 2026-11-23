import { Router, type Request } from "express";
import type { RouteContext } from "./context.js";

/** /api/orders/:slug/tables/:table: what the customer at that table sees (VM-07). No sign-in,
 *  like ordering itself: knowing the table's address is enough, and only that table is shown. */
/** :table comes from the parent path (mergeParams), which Express's types can't see here. */
const tableOf = (req: Request) => String((req.params as Record<string, string>).table);

export function tableRoutes({ services, restaurant }: RouteContext) {
    const r = Router({ mergeParams: true });
    r.get("/orders/:id", async (req, res) => {
        const place = await restaurant(req);
        res.json(await services(req).table.order(place._id, tableOf(req), String(req.params.id)));
    });
    // VM-30: "Request bill" and "Call staff"
    r.post("/requests", async (req, res) => {
        const place = await restaurant(req);
        res.json(await services(req).requests.ask(place._id, tableOf(req), req.body));
    });
    r.get("/open-bill", async (req, res) => {
        const place = await restaurant(req);
        res.json(await services(req).table.openBill(place._id, tableOf(req)));
    });
    return r;
}
