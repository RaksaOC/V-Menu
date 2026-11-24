import api, { seg } from "@/lib/api";
import type { Order, OrderStatus } from "@vmenu/contracts";

/** New, preparing and ready orders, oldest first. Served and cancelled ones stay on the server (VM-10, VM-27). */
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

/** One step forward (VM-27): pending → preparing → ready → served. A skipped step is a 409. */
export async function setOrderStatus(slug: string, orderId: string, status: OrderStatus): Promise<Order> {
    const { data } = await api.patch<Order>(`/api/orders/${seg(slug)}/kitchen/${seg(orderId)}/status`, { status });
    return data;
}
