import api, { seg } from "@/lib/api";
import type { PlaceOrderBody, PublicMenu, TableBill, TableOrderView, TableRequestKind } from "@vmenu/contracts";

/** The dishes a customer can order, by category (public, no sign-in; VM-25). */
export async function getMenu(slug: string): Promise<PublicMenu> {
    const { data } = await api.get<PublicMenu>(`/api/menu/${seg(slug)}/public/items`);
    return data;
}

/** Resolves when the table exists and is open; rejects with 404 otherwise. */
export async function checkTable(slug: string, table: string): Promise<void> {
    await api.get(`/api/menu/${seg(slug)}/public/tables/${seg(table)}`);
}

/** Places the order; resolves with the saved order (its id opens the confirmation, VM-07). */
export async function placeOrder(slug: string, order: PlaceOrderBody): Promise<{ _id: string }> {
    const { data } = await api.post<{ _id: string }>(`/api/orders/${seg(slug)}`, order);
    return data;
}

/** One order as the server saved it (VM-07), with its status (VM-27); the table's open bill. */
export type { TableBill, TableOrderView } from "@vmenu/contracts";

export async function getTableOrder(slug: string, table: string, orderId: string): Promise<TableOrderView> {
    const { data } = await api.get<TableOrderView>(`/api/orders/${seg(slug)}/tables/${seg(table)}/orders/${seg(orderId)}`);
    return data;
}

export async function getTableBill(slug: string, table: string): Promise<TableBill> {
    const { data } = await api.get<TableBill>(`/api/orders/${seg(slug)}/tables/${seg(table)}/open-bill`);
    return data;
}

/** VM-30: "Request bill" or "Call staff": flags the table's open bill for the cashier. */
export async function askStaff(slug: string, table: string, kind: TableRequestKind): Promise<{ kind: TableRequestKind; at: string }> {
    const { data } = await api.post(`/api/orders/${seg(slug)}/tables/${seg(table)}/requests`, { kind });
    return data;
}
