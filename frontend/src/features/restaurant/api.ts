import type { Category, CreateItemBody, CreateTableBody, MenuItem, Overview, Table } from "@vmenu/contracts";
import type { PhotoUploadForm, UploadedPhoto } from "@vmenu/contracts";
import api, { postToStorage, seg } from "@/lib/api";

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
 * PHOTOS-S3, in three steps:
 * 1. menu-service signs a form for one upload (this file's type, at most 5 MB, for 10 minutes);
 * 2. the file goes straight to object storage with it, which enforces all three;
 * 3. menu-service checks the upload, re-encodes it and answers its URL. It refuses non-photos
 *    (415) and uploads that expired (410).
 */
export async function uploadMenuPhoto(slug: string, file: File, onProgress?: (percent: number) => void): Promise<string> {
    const { data: form } = await api.post<PhotoUploadForm>(`/api/menu/${seg(slug)}/images/uploads`, { contentType: file.type });
    await postToStorage(form, file, onProgress);
    const { data } = await api.post<UploadedPhoto>(`/api/menu/${seg(slug)}/images`, { key: form.key });
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
