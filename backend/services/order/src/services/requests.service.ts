import { assertId, HttpError, notFound, parse } from "@vmenu/common";
import { REQUEST_EVERY_MS, TableRequestBody, TableRequestKind } from "@vmenu/contracts";
import { REQUEST_FLAG, type BillsRepo } from "../repositories/bills.repo.js";
import { withTotals } from "./bill-totals.js";

/**
 * VM-30: "Request bill" and "Call staff" on the customer's menu. Each sets a flag on the table's
 * open bill, which the cashier sees until the bill is paid or they dismiss it. Each button works
 * at most once per 2 minutes per bill, dismissed or not, so a table can't flood the cashier.
 */
export function requestsService({ bills }: { bills: BillsRepo }) {
    return {
        async ask(resId: string, table: string, body: unknown) {
            const { kind } = parse(TableRequestBody, body ?? {});
            const bill = await bills.findOpen(resId, table);
            if (!bill || !bill.orders.some(Boolean))
                throw new HttpError(409, "Once you've ordered, you can ask for the bill or call staff from here.", "NO_OPEN_BILL");
            const now = new Date();
            const last = bill.requestLog?.[kind];
            if (last && now.getTime() - new Date(last).getTime() < REQUEST_EVERY_MS)
                throw new HttpError(429, "You asked a moment ago. Someone will be with you soon.", "REQUEST_TOO_SOON");
            const at = bill[REQUEST_FLAG[kind]] ?? now; // still waiting: it keeps its first time
            await bills.markRequest(resId, String(bill._id), kind, at, now);
            return { kind, at };
        },

        async dismiss(resId: string, billId: string, kind: string) {
            assertId(billId, "bill id");
            const which = parse(TableRequestKind, kind);
            const bill = await bills.clearRequest(resId, billId, which);
            if (!bill) throw notFound("Bill not found");
            return withTotals(bill);
        },
    };
}
