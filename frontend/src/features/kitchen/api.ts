import api, { seg } from "@/lib/api";
import type { OrderOutput } from "@/lib/types/Order";

/** Every order of the restaurant, done and not done. */
export async function getKitchenOrders(slug: string): Promise<OrderOutput[]> {
    const { data } = await api.get<OrderOutput[]>(`/api/orders/${seg(slug)}/kitchen`);
    return data;
}

export async function markOrderDone(slug: string, orderId: string): Promise<void> {
    await api.patch(`/api/orders/${seg(slug)}/kitchen/${seg(orderId)}/done`);
}
