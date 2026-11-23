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

/** Places the order; resolves with the saved order (its id opens the confirmation, VM-07). */
export async function placeOrder(slug: string, order: OrderInput): Promise<{ _id: string }> {
    const { data } = await api.post<{ _id: string }>(`/api/orders/${seg(slug)}`, order);
    return data;
}

/** One order as the server saved it: the menu's prices, the totals (VM-07). */
export interface TableOrderView {
    _id: string;
    /** short number shown to the customer, e.g. "ABC123" */
    number: string;
    table: string;
    placedAt: string;
    lines: { name: string; price: number; quantity: number; total: number }[];
    total: number;
}

/** The orders on the table's open bill so far, and the running total. */
export interface TableBill {
    table: string;
    orders: TableOrderView[];
    total: number;
}

export async function getTableOrder(slug: string, table: string, orderId: string): Promise<TableOrderView> {
    const { data } = await api.get<TableOrderView>(`/api/orders/${seg(slug)}/tables/${seg(table)}/orders/${seg(orderId)}`);
    return data;
}

export async function getTableBill(slug: string, table: string): Promise<TableBill> {
    const { data } = await api.get<TableBill>(`/api/orders/${seg(slug)}/tables/${seg(table)}/open-bill`);
    return data;
}
