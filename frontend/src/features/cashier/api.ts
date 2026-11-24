import api, { seg } from "@/lib/api";
import type { ItemOutput } from "@/lib/types/Item";
import type { Overview } from "@/lib/types/Overview";
import type { TableOutput } from "@/lib/types/Table";
import type { TableOrderOutput } from "@/lib/types/TableOrder";

export async function getTables(slug: string): Promise<TableOutput[]> {
    const { data } = await api.get<TableOutput[]>(`/api/menu/${seg(slug)}/tables`);
    return data;
}

/** Opens (true) or closes (false) a table for orders. */
export async function setTableAvailability(slug: string, tableId: string, isEnabled: boolean): Promise<void> {
    await api.patch(`/api/menu/${seg(slug)}/tables/${seg(tableId)}/availability`, { isEnabled });
}

export async function getMenuItems(slug: string): Promise<ItemOutput[]> {
    const { data } = await api.get<ItemOutput[]>(`/api/menu/${seg(slug)}/items`);
    return data;
}

/** Shows (true) or hides (false) a dish on the customer menu. */
export async function setItemAvailability(slug: string, itemId: string, isEnabled: boolean): Promise<void> {
    await api.patch(`/api/menu/${seg(slug)}/items/${seg(itemId)}/availability`, { isEnabled });
}

/** Every bill of the restaurant, paid and unpaid. */
export async function getBills(slug: string): Promise<TableOrderOutput[]> {
    const { data } = await api.get<TableOrderOutput[]>(`/api/orders/${seg(slug)}/bills`);
    return data;
}

export async function setBillPaid(slug: string, billId: string, isPayed: boolean): Promise<void> {
    await api.patch(`/api/orders/${seg(slug)}/bills/${seg(billId)}`, { isPayed });
}

export async function getOverview(slug: string): Promise<Overview> {
    const { data } = await api.get<Overview>(`/api/orders/${seg(slug)}/overview`);
    return data;
}
