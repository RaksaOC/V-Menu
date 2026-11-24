import api, { seg } from "@/lib/api";
import type { ItemOutput } from "@/lib/types/Item";
import type { OrderInput } from "@/lib/types/Order";

/** The dishes a customer can order (public, no sign-in). */
export async function getMenu(slug: string): Promise<ItemOutput[]> {
    const { data } = await api.get<ItemOutput[]>(`/api/menu/${seg(slug)}/public/items`);
    return data;
}

/** Resolves when the table exists and is open; rejects with 404 otherwise. */
export async function checkTable(slug: string, table: string): Promise<void> {
    await api.get(`/api/menu/${seg(slug)}/public/tables/${seg(table)}`);
}

export async function placeOrder(slug: string, order: OrderInput): Promise<void> {
    await api.post(`/api/orders/${seg(slug)}`, order);
}
