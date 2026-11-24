import api, { seg } from "@/lib/api";
import type { Order } from "@vmenu/contracts";

/** The orders still to cook, oldest first. Finished ones never leave the server (VM-10). */
export async function getActiveOrders(slug: string): Promise<Order[]> {
    const { data } = await api.get<Order[]>(`/api/orders/${seg(slug)}/kitchen?status=active`);
    return data;
}

/** One page of finished orders, newest first. */
export interface KitchenHistoryPage {
    orders: Order[];
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export const HISTORY_PAGE_SIZE = 20;

export async function getKitchenHistory(slug: string, page: number): Promise<KitchenHistoryPage> {
    const { data } = await api.get<KitchenHistoryPage>(`/api/orders/${seg(slug)}/kitchen/history?page=${page}&limit=${HISTORY_PAGE_SIZE}`);
    return data;
}

export async function markOrderDone(slug: string, orderId: string): Promise<void> {
    await api.patch(`/api/orders/${seg(slug)}/kitchen/${seg(orderId)}/done`);
}
