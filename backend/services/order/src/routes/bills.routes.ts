import { Router } from "express";
import { badRequest, parse, requireRole } from "@vmenu/common";
import { UpdateBillBody } from "@vmenu/contracts";
import type { RouteContext } from "./context.js";

// CL-06: answers carry the old name too, for clients not yet updated. Remove in the next release.
const withOldName = <T extends { isPaid: boolean }>(bill: T) => ({ ...bill, isPayed: bill.isPaid });

/** /api/orders/:slug/bills: the cashier's bills. */
export function billsRoutes({ services, restaurant }: RouteContext) {
    const r = Router({ mergeParams: true });
    r.use(requireRole("cashier"));
    // VM-11: ?status=open (the default) for the bills to settle; ?status=paid&page= for history.
    r.get("/", async (req, res) => {
        const resId = (await restaurant(req))._id;
        const status = req.query.status ?? "open";
        if (status === "open") return res.json((await services(req).bills.open(resId)).map(withOldName));
        if (status === "paid") {
            const page = await services(req).bills.paid(resId, req.query);
            return res.json({ ...page, bills: page.bills.map(withOldName) });
        }
        throw badRequest("status must be open or paid");
    });
    r.patch("/:id", async (req, res) => {
        const resId = (await restaurant(req))._id; // access first: 403 before 400
        const { isPaid } = parse(UpdateBillBody, req.body ?? {});
        res.json(withOldName(await services(req).bills.setPaid(resId, String(req.params.id), isPaid)));
    });
    return r;
}
