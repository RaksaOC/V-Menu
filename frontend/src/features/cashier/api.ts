import api, { seg } from "@/lib/api";
import type { Bill } from "@vmenu/contracts";

/** The bills still to settle, with their orders, newest first (VM-11). */
export async function getOpenBills(slug: string): Promise<Bill[]> {
    const { data } = await api.get<Bill[]>(`/api/orders/${seg(slug)}/bills?status=open`);
    return data;
}

/** One page of paid bills, most recently paid first. */
export interface PaidBillsPage {
    bills: Bill[];
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export const BILLS_PAGE_SIZE = 20;

export async function getPaidBills(slug: string, page: number): Promise<PaidBillsPage> {
    const { data } = await api.get<PaidBillsPage>(`/api/orders/${seg(slug)}/bills?status=paid&page=${page}&limit=${BILLS_PAGE_SIZE}`);
    return data;
}

export async function setBillPaid(slug: string, billId: string, isPayed: boolean): Promise<void> {
    await api.patch(`/api/orders/${seg(slug)}/bills/${seg(billId)}`, { isPayed });
}

export { getTables, setTableAvailability, getMenuItems, setItemAvailability, getOverview } from "@/features/restaurant/api";
