import type { Bill, TableRequestKind } from "@vmenu/contracts";
import api, { seg } from "@/lib/api";

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

export async function setBillPaid(slug: string, billId: string, isPaid: boolean): Promise<void> {
    await api.patch(`/api/orders/${seg(slug)}/bills/${seg(billId)}`, { isPaid });
}

/** VM-27: cancel one order on an open bill, with a reason. It stays on the bill, struck through, uncharged. */
export async function cancelOrder(slug: string, billId: string, orderId: string, reason: string): Promise<void> {
    await api.patch(`/api/orders/${seg(slug)}/bills/${seg(billId)}/orders/${seg(orderId)}/cancel`, { reason });
}

/** VM-30: clears a "bill requested" or "staff called" badge. */
export async function dismissRequest(slug: string, billId: string, kind: TableRequestKind): Promise<void> {
    await api.delete(`/api/orders/${seg(slug)}/bills/${seg(billId)}/requests/${kind}`);
}

export { getTables, setTableAvailability, getMenuItems, setItemAvailability, getOverview } from "@/features/restaurant/api";
