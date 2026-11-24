import { Router, type Request } from "express";
import { invalidTableLink, tableNameLinksAllowed } from "@vmenu/common";
import { QrToken } from "@vmenu/contracts";
import type { RouteContext } from "./context.js";

/** Which table this request is about: resolved from the URL, or refused. */
type TableOf = (req: Request, resId: string, orders: ReturnType<RouteContext["services"]>["orders"]) => Promise<string>;

/** /api/orders/:slug/tables/:table: only where links by name are switched on (SEC-04).
 *  :table comes from the parent path (mergeParams), which Express's types can't see here. */
export const byName: TableOf = async (req) => {
    if (!tableNameLinksAllowed()) throw invalidTableLink();
    return String((req.params as Record<string, string>).table);
};

/** /api/orders/:slug/t/:token: the table's own link (SEC-04). */
export const byToken: TableOf = async (req, resId, orders) => {
    const token = String((req.params as Record<string, string>).token);
    if (!QrToken.safeParse(token).success) throw invalidTableLink();
    return orders.tableNameOf(resId, token);
};

/** What the customer at that table sees (VM-07). No sign-in, like ordering itself; only that
 *  table is shown. */
export function tableRoutes({ services, restaurant }: RouteContext, tableOf: TableOf) {
    const r = Router({ mergeParams: true });
    r.get("/orders/:id", async (req, res) => {
        const place = await restaurant(req);
        const s = services(req);
        res.json(await s.table.order(place._id, await tableOf(req, place._id, s.orders), String(req.params.id)));
    });
    // VM-30: "Request bill" and "Call staff"
    r.post("/requests", async (req, res) => {
        const place = await restaurant(req);
        const s = services(req);
        res.json(await s.requests.ask(place._id, await tableOf(req, place._id, s.orders), req.body));
    });
    r.get("/open-bill", async (req, res) => {
        const place = await restaurant(req);
        const s = services(req);
        res.json(await s.table.openBill(place._id, await tableOf(req, place._id, s.orders)));
    });
    return r;
}
