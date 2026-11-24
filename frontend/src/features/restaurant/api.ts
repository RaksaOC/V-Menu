import api, { seg } from "@/lib/api";
import type { CreateItemBody, CreateTableBody, MenuItem, Overview, Table } from "@vmenu/contracts";

// CL-09: the calls the owner and the cashier both make about one restaurant (tables, menu,
// overview), in one place. owner/api.ts and cashier/api.ts re-export what each role uses.

export async function getOverview(slug: string): Promise<Overview> {
    const { data } = await api.get<Overview>(`/api/orders/${seg(slug)}/overview`);
    return data;
}

export async function getMenuItems(slug: string): Promise<MenuItem[]> {
    const { data } = await api.get<MenuItem[]>(`/api/menu/${seg(slug)}/items`);
    return data;
}

export async function createMenuItem(slug: string, item: CreateItemBody): Promise<void> {
    await api.post(`/api/menu/${seg(slug)}/items`, item);
}

export async function updateMenuItem(slug: string, item: MenuItem): Promise<void> {
    await api.put(`/api/menu/${seg(slug)}/items/${seg(item._id)}`, item);
}

export async function deleteMenuItem(slug: string, itemId: string): Promise<void> {
    await api.delete(`/api/menu/${seg(slug)}/items/${seg(itemId)}`);
}

export async function getTables(slug: string): Promise<Table[]> {
    const { data } = await api.get<Table[]>(`/api/menu/${seg(slug)}/tables`);
    return data;
}

export async function createTable(slug: string, table: CreateTableBody): Promise<void> {
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

/** Opens (true) or closes (false) a table for orders. */
export async function setTableAvailability(slug: string, tableId: string, isEnabled: boolean): Promise<void> {
    await api.patch(`/api/menu/${seg(slug)}/tables/${seg(tableId)}/availability`, { isEnabled });
}

/** Shows (true) or hides (false) a dish on the customer menu. */
export async function setItemAvailability(slug: string, itemId: string, isEnabled: boolean): Promise<void> {
    await api.patch(`/api/menu/${seg(slug)}/items/${seg(itemId)}/availability`, { isEnabled });
}
