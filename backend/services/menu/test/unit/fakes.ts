// In-memory repositories for the service unit tests (CL-04): no MongoDB. Like MongoDB, they
// hand out copies, so a service can't change stored data without calling the repository.
import { Readable } from "node:stream";
import type { CategoriesRepo, CategoryRecord } from "../../src/repositories/categories.repo.js";
import type { ImagesRepo } from "../../src/repositories/images.repo.js";
import type { ItemRecord, ItemsRepo } from "../../src/repositories/items.repo.js";
import { newQrToken } from "../../src/qr-token.js";
import { TableNameTaken, type TableRecord, type TablesRepo } from "../../src/repositories/tables.repo.js";

let seq = 0;
export const newId = () => (++seq).toString(16).padStart(24, "0");

export function fakeItems(): ItemsRepo & { all: ItemRecord[] } {
    const all: ItemRecord[] = [];
    const find = (resId: string, id: string) => all.find((i) => i._id === id && i.resId === resId);
    return {
        all,
        async list(resId) {
            return all.filter((i) => i.resId === resId);
        },
        async get(resId, id) {
            const found = find(resId, id);
            return found ? { ...found } : null;
        },
        async create(resId, fields) {
            const item = { _id: newId(), isEnabled: true, ...fields, resId };
            all.push(item);
            return item;
        },
        async update(resId, id, fields) {
            const item = find(resId, id);
            if (!item) return null;
            Object.assign(item, fields);
            return { ...item };
        },
        async remove(resId, id) {
            const item = find(resId, id);
            if (!item) return null;
            all.splice(all.indexOf(item), 1);
            return item;
        },
        async count(resId) {
            return all.filter((i) => i.resId === resId).length;
        },
        async findEnabled(resId, ids) {
            return all.filter((i) => i.resId === resId && i.isEnabled && ids.includes(i._id));
        },
        async clearCategory(resId, categoryId) {
            const moved = all.filter((i) => i.resId === resId && i.categoryId === categoryId);
            for (const i of moved) i.categoryId = null;
            return moved.length;
        },
    };
}

export function fakeCategories(): CategoriesRepo & { all: CategoryRecord[] } {
    const all: CategoryRecord[] = [];
    const find = (resId: string, id: string) => all.find((c) => c._id === id && c.resId === resId);
    return {
        all,
        async list(resId) {
            return all
                .filter((c) => c.resId === resId)
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((c) => ({ ...c }));
        },
        async get(resId, id) {
            const found = find(resId, id);
            return found ? { ...found } : null;
        },
        async findByName(resId, name) {
            const found = all.find((c) => c.resId === resId && c.name.toLowerCase() === name.toLowerCase());
            return found ? { ...found } : null;
        },
        async create(resId, fields) {
            const category = { _id: newId(), ...fields, resId };
            all.push(category);
            return { ...category };
        },
        async update(resId, id, fields) {
            const category = find(resId, id);
            if (!category) return null;
            Object.assign(category, fields);
            return { ...category };
        },
        async setOrder(resId, ids) {
            ids.forEach((id, sortOrder) => {
                const category = find(resId, id);
                if (category) category.sortOrder = sortOrder;
            });
        },
        async remove(resId, id) {
            const category = find(resId, id);
            if (!category) return null;
            all.splice(all.indexOf(category), 1);
            return category;
        },
    };
}

export function fakeTables(): TablesRepo & { all: TableRecord[] } {
    const all: TableRecord[] = [];
    const find = (resId: string, id: string) => all.find((t) => t._id === id && t.resId === resId);
    return {
        all,
        async list(resId) {
            return all.filter((t) => t.resId === resId);
        },
        async get(resId, id) {
            const found = find(resId, id);
            return found ? { ...found } : null;
        },
        async findByName(resId, name) {
            return all.find((t) => t.resId === resId && t.name === name) ?? null;
        },
        async findByToken(resId, qrToken) {
            return all.find((t) => t.resId === resId && t.qrToken === qrToken) ?? null;
        },
        // Like the unique { resId, name } index (VM-16): a used name is refused at write time.
        async create(resId, fields) {
            await Promise.resolve(); // a write takes a moment, so parallel creates can race as they do on MongoDB
            if (all.some((t) => t.resId === resId && t.name === fields.name)) throw new TableNameTaken(fields.name);
            const table = { _id: newId(), qrToken: newQrToken(), ...fields, resId };
            all.push(table);
            return table;
        },
        async update(resId, id, fields) {
            const table = find(resId, id);
            if (!table) return null;
            if (fields.name !== undefined && all.some((t) => t !== table && t.resId === resId && t.name === fields.name))
                throw new TableNameTaken(fields.name);
            Object.assign(table, fields);
            return { ...table };
        },
        async remove(resId, id) {
            const table = find(resId, id);
            if (!table) return null;
            all.splice(all.indexOf(table), 1);
            return table;
        },
        async count(resId, { isEnabled } = {}) {
            return all.filter((t) => t.resId === resId && (isEnabled === undefined || t.isEnabled === isEnabled)).length;
        },
    };
}

export function fakeImages(): ImagesRepo & { files: Map<string, { resId: string; data: Buffer }>; failRemove: boolean } {
    const files = new Map<string, { resId: string; data: Buffer }>();
    return {
        files,
        failRemove: false,
        async save(webp, resId) {
            const id = newId();
            files.set(id, { resId, data: webp });
            return id;
        },
        async find(resId, id) {
            const f = files.get(id);
            return f && f.resId === resId ? { length: f.data.length } : null;
        },
        stream(id) {
            return Readable.from([files.get(id)!.data]);
        },
        async remove(resId, id) {
            if (this.failRemove) throw new Error("storage down");
            if (files.get(id)?.resId === resId) files.delete(id);
        },
    };
}

/** VM-15: order-service, mocked: no table has an unpaid bill. */
export const NO_OPEN_BILLS = { hasOpenBill: async () => false };
