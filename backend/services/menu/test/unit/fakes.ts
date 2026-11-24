// In-memory repositories for the service unit tests (CL-04): no MongoDB. Like MongoDB, they
// hand out copies, so a service can't change stored data without calling the repository.
import { Readable } from "node:stream";
import type { ImagesRepo } from "../../src/repositories/images.repo.js";
import type { ItemRecord, ItemsRepo } from "../../src/repositories/items.repo.js";
import type { TableRecord, TablesRepo } from "../../src/repositories/tables.repo.js";

let seq = 0;
export const newId = () => (++seq).toString(16).padStart(24, "0");

export function fakeItems(): ItemsRepo & { all: ItemRecord[] } {
    const all: ItemRecord[] = [];
    const find = (resId: string, id: string) => all.find((i) => i._id === id && i.resId === resId);
    return {
        all,
        async list(resId, { enabledOnly = false } = {}) {
            return all.filter((i) => i.resId === resId && (!enabledOnly || i.isEnabled));
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
        async create(resId, fields) {
            const table = { _id: newId(), ...fields, resId };
            all.push(table);
            return table;
        },
        async update(resId, id, fields) {
            const table = find(resId, id);
            if (!table) return null;
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
