import type { Category, CreateItemBody, CreateTableBody, MenuItem, Overview, Table } from "@vmenu/contracts";
import api, { seg } from "@/lib/api";

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

// VM-25: menu categories. The owner arranges them; the cashier reads them to filter the menu.
export async function getCategories(slug: string): Promise<Category[]> {
    const { data } = await api.get<Category[]>(`/api/menu/${seg(slug)}/categories`);
    return data;
}

export async function createCategory(slug: string, name: string): Promise<Category> {
    const { data } = await api.post<Category>(`/api/menu/${seg(slug)}/categories`, { name });
    return data;
}

export async function renameCategory(slug: string, id: string, name: string): Promise<Category> {
    const { data } = await api.put<Category>(`/api/menu/${seg(slug)}/categories/${seg(id)}`, { name });
    return data;
}

/** Every category id, in the new order; answers the categories in that order. */
export async function reorderCategories(slug: string, ids: string[]): Promise<Category[]> {
    const { data } = await api.put<Category[]>(`/api/menu/${seg(slug)}/categories/order`, { ids });
    return data;
}

/** Its dishes move to "Other". */
export async function deleteCategory(slug: string, id: string): Promise<void> {
    await api.delete(`/api/menu/${seg(slug)}/categories/${seg(id)}`);
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

/** SEC-04: gives the table a new QR link; the old printed code stops working. Answers the table. */
export async function resetTableQrToken(slug: string, tableId: string): Promise<Table> {
    const { data } = await api.post<Table>(`/api/menu/${seg(slug)}/tables/${seg(tableId)}/qr-token`);
    return data;
}

/** Opens (true) or closes (false) a table for orders. */
export async function setTableAvailability(slug: string, tableId: string, isEnabled: boolean): Promise<void> {
    await api.patch(`/api/menu/${seg(slug)}/tables/${seg(tableId)}/availability`, { isEnabled });
}

/** Shows (true) or hides (false) a dish on the customer menu. */
export async function setItemAvailability(slug: string, itemId: string, isEnabled: boolean): Promise<void> {
    await api.patch(`/api/menu/${seg(slug)}/items/${seg(itemId)}/availability`, { isEnabled });
}
