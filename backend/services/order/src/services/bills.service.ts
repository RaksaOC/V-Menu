import { assertId, badRequest, HttpError, notFound } from "@vmenu/common";
import { OpenBillExists, type BillsRepo } from "../repositories/bills.repo.js";
import { pages, paging } from "./paging.js";

/** The cashier's bills, one per table visit. */
export function billsService({ bills }: { bills: BillsRepo }) {
    return {
        /** What the cashier works on: the open bills, newest first (VM-11). */
        open: (resId: string) => bills.listOpen(resId),

        /** Paid bills, most recently paid first, a page at a time (VM-11). */
        async paid(resId: string, query: { page?: unknown; limit?: unknown }) {
            const { page, limit, skip } = paging(query);
            const { bills: list, total } = await bills.pagePaid(resId, skip, limit);
            return { bills: list, page, limit, total, pages: pages(total, limit) };
        },

        async setPaid(resId: string, id: string, isPayed: boolean) {
            assertId(id, "bill id");
            if (typeof isPayed !== "boolean") throw badRequest("isPayed must be true or false");
            // VM-08: re-opening a paid bill would give the table two open bills if it has a new one.
            const tableHasOpenBill = () =>
                new HttpError(409, "This table already has an open bill. Add to that one instead.", "TABLE_HAS_OPEN_BILL");
            if (!isPayed) {
                const current = await bills.get(resId, id);
                if (!current) throw notFound("Bill not found");
                if (current.isPayed && (await bills.hasOtherOpenBill(resId, current.table, id))) throw tableHasOpenBill();
            }
            try {
                const bill = await bills.setPaid(resId, id, isPayed);
                if (!bill) throw notFound("Bill not found");
                return bill;
            } catch (err) {
                if (err instanceof OpenBillExists) throw tableHasOpenBill(); // lost a race with a new order
                throw err;
            }
        },
    };
}
