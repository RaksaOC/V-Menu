import api, { seg } from "@/lib/api";
import type { ItemInput, ItemOutput } from "@/lib/types/Item";
import type { Overview } from "@/lib/types/Overview";
import type { RestaurantOutput } from "@/lib/types/Restaurant";
import type { TableInput, TableOutput } from "@/lib/types/Table";

export interface TopItem {
    name: string;
    quantity: number;
}

/** Totals across all of the owner's restaurants. */
export interface OwnerOverview {
    numOfUnpaidOrders: number;
    numOfItems: number;
    numOfOrders: number;
    numOfPayments: number;
    numOfMoneyEarned: number;
    totalItemsSold: number;
    avgItemsPerOrder: number;
    topSellingItems: TopItem[];
}

/** One restaurant's numbers, for the "All restaurants" list. */
export interface RestaurantSummary extends Overview {
    resId: string;
    resName: string;
}

export async function getRestaurants(): Promise<RestaurantOutput[]> {
    const { data } = await api.get<RestaurantOutput[]>("/api/restaurants");
    return data;
}

/** Creates a restaurant and returns the owner's restaurants, the new one last. */
export async function createRestaurant(name: string): Promise<RestaurantOutput[]> {
    const { data } = await api.post<RestaurantOutput[]>("/api/restaurants", { name });
    return data;
}

export async function getOwnerOverview(): Promise<OwnerOverview> {
    const { data } = await api.get<OwnerOverview>("/api/orders/owner/overview");
    return data;
}

export async function getRestaurantSummaries(): Promise<RestaurantSummary[]> {
    const { data } = await api.get<RestaurantSummary[]>("/api/orders/owner/restaurants");
    return data;
}

export async function getOverview(slug: string): Promise<Overview> {
    const { data } = await api.get<Overview>(`/api/orders/${seg(slug)}/overview`);
    return data;
}

export async function getMenuItems(slug: string): Promise<ItemOutput[]> {
    const { data } = await api.get<ItemOutput[]>(`/api/menu/${seg(slug)}/items`);
    return data;
}

export async function createMenuItem(slug: string, item: ItemInput): Promise<void> {
    await api.post(`/api/menu/${seg(slug)}/items`, item);
}

export async function updateMenuItem(slug: string, item: ItemOutput): Promise<void> {
    await api.put(`/api/menu/${seg(slug)}/items/${seg(item._id)}`, item);
}

export async function deleteMenuItem(slug: string, itemId: string): Promise<void> {
    await api.delete(`/api/menu/${seg(slug)}/items/${seg(itemId)}`);
}

export async function getTables(slug: string): Promise<TableOutput[]> {
    const { data } = await api.get<TableOutput[]>(`/api/menu/${seg(slug)}/tables`);
    return data;
}

export async function createTable(slug: string, table: TableInput): Promise<void> {
    await api.post(`/api/menu/${seg(slug)}/tables`, table);
}

export async function updateTable(slug: string, tableId: string, changes: { name: string }): Promise<void> {
    await api.put(`/api/menu/${seg(slug)}/tables/${seg(tableId)}`, changes);
}

export async function deleteTable(slug: string, tableId: string): Promise<void> {
    await api.delete(`/api/menu/${seg(slug)}/tables/${seg(tableId)}`);
}

/**
 * Uploads a menu photo (VM-02) and returns its short URL, which is then saved on the item.
 * The server checks the type, re-encodes it and refuses files over 5 MB (413) or non-photos (415).
 */
export async function uploadMenuPhoto(slug: string, file: File, onProgress?: (percent: number) => void): Promise<string> {
    const form = new FormData();
    form.append("image", file);
    const { data } = await api.post<{ url: string }>(`/api/menu/${seg(slug)}/images`, form, {
        onUploadProgress: (e) => {
            if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total));
        },
    });
    return data.url;
}
