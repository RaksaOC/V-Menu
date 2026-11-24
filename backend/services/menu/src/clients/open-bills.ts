import type { Request } from "express";
import { callService } from "@vmenu/common";
import { OpenBillCheck } from "@vmenu/contracts";

/** VM-15: asks order-service whether a table has an unpaid bill. */
export interface OpenBills {
    hasOpenBill(resId: string, table: string): Promise<boolean>;
}

/** The client for one request (its id goes along, so the logs of both services line up). */
export type OpenBillsFor = (req: Request) => OpenBills;

export const httpOpenBills: OpenBillsFor = (req) => ({
    async hasOpenBill(resId, table) {
        const path = `/internal/restaurants/${encodeURIComponent(resId)}/tables/${encodeURIComponent(table)}/open-bill`;
        return OpenBillCheck.parse(await callService(process.env.ORDER_SERVICE_URL!, path, req)).open;
    },
});
