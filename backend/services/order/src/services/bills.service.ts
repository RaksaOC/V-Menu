import { assertId, badRequest, notFound } from "@vmenu/common";
import type { BillsRepo } from "../repositories/bills.repo.js";

/** The cashier's bills, one per table visit. */
export function billsService({ bills }: { bills: BillsRepo }) {
    return {
        list: (resId: string) => bills.listWithOrders(resId),

        async setPaid(resId: string, id: string, isPayed: boolean) {
            assertId(id, "bill id");
            if (typeof isPayed !== "boolean") throw badRequest("isPayed must be true or false");
            const bill = await bills.setPaid(resId, id, isPayed);
            if (!bill) throw notFound("Bill not found");
            return bill;
        },
    };
}
