import api, { seg } from "@/lib/api";
import type { PlaceOrderBody, PublicMenu, TableBill, TableLink as TableLinkInfo, TableOrderView, TableRequestKind } from "@vmenu/contracts";
import type { TableLink } from "./table-link";

/** The dishes a customer can order, by category (public, no sign-in; VM-25). */
export async function getMenu(slug: string): Promise<PublicMenu> {
    const { data } = await api.get<PublicMenu>(`/api/menu/${seg(slug)}/public/items`);
    return data;
}

/** SEC-04: the table behind a link token: its name and whether it's open. 404 for a link that isn't valid. */
export async function getTableByToken(slug: string, token: string): Promise<TableLinkInfo> {
    const { data } = await api.get<TableLinkInfo>(`/api/menu/${seg(slug)}/public/t/${seg(token)}`);
    return data;
}

/** Resolves when the table exists and is open; rejects with 404 otherwise. Old pages by name only. */
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

/** SEC-04: the table's own link (token), or its name on the old pages. */
const tablePath = (link: TableLink) =>
    link.token ? `/api/orders/${seg(link.slug)}/t/${seg(link.token)}` : `/api/orders/${seg(link.slug)}/tables/${seg(link.name)}`;

export async function getTableOrder(link: TableLink, orderId: string): Promise<TableOrderView> {
    const { data } = await api.get<TableOrderView>(`${tablePath(link)}/orders/${seg(orderId)}`);
    return data;
}

export async function getTableBill(link: TableLink): Promise<TableBill> {
    const { data } = await api.get<TableBill>(`${tablePath(link)}/open-bill`);
    return data;
}

/** VM-30: "Request bill" or "Call staff": flags the table's open bill for the cashier. */
export async function askStaff(link: TableLink, kind: TableRequestKind): Promise<{ kind: TableRequestKind; at: string }> {
    const { data } = await api.post(`${tablePath(link)}/requests`, { kind });
    return data;
}
