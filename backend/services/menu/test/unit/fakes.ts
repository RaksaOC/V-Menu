// In-memory repositories for the service unit tests (CL-04): no MongoDB. Like MongoDB, they
// hand out copies, so a service can't change stored data without calling the repository.
import { Readable } from "node:stream";
import type { CategoriesRepo, CategoryRecord } from "../../src/repositories/categories.repo.js";
import type { ImagesRepo } from "../../src/repositories/images.repo.js";
import type { PhotoStore, SignedUpload } from "../../src/repositories/photo-store.js";
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
        async countWithImage(resId, image) {
            return all.filter((i) => i.resId === resId && i.image === image).length;
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

/** The GridFS photos from before PHOTOS-S3. `save` stands in for the old upload. */
export function fakeImages(): ImagesRepo & {
    files: Map<string, { resId: string; data: Buffer; movedTo?: string }>;
    save(webp: Buffer, resId: string): Promise<string>;
    failRemove: boolean;
} {
    const files = new Map<string, { resId: string; data: Buffer; movedTo?: string }>();
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
        async unmoved() {
            return [...files].filter(([, f]) => !f.movedTo).map(([id, f]) => ({ id, resId: f.resId, length: f.data.length }));
        },
        async read(id) {
            return Buffer.from(files.get(id)!.data);
        },
        async markMoved(id, key) {
            files.get(id)!.movedTo = key;
        },
    };
}

/** PHOTOS-S3: object storage in memory. `browserPost` puts a file where a signed form would. */
export function fakePhotoStore(): PhotoStore & {
    objects: Map<string, { data: Buffer; contentType: string; cacheControl?: string }>;
    browserPost(key: string, data: Buffer, contentType?: string): void;
    signed: SignedUpload[];
    down: boolean;
    failPut: (key: string) => boolean;
    failDelete: boolean;
    setupCalls: number;
} {
    const objects = new Map<string, { data: Buffer; contentType: string; cacheControl?: string }>();
    const check = (store: { down: boolean }) => {
        if (store.down) throw new Error("storage down");
    };
    return {
        objects,
        signed: [],
        down: false,
        failPut: () => false,
        failDelete: false,
        setupCalls: 0,
        browserPost(key, data, contentType = "image/jpeg") {
            objects.set(key, { data, contentType });
        },
        async setup() {
            check(this);
            this.setupCalls++;
        },
        async signUpload(key, contentType, maxBytes) {
            const form: SignedUpload = {
                key,
                url: "http://storage.test/vmenu-photos",
                fields: { key, "Content-Type": contentType, policy: "test" },
                expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
                maxBytes,
            };
            this.signed.push(form);
            return form;
        },
        async size(key) {
            check(this);
            return objects.get(key)?.data.length ?? null;
        },
        async get(key) {
            check(this);
            const o = objects.get(key);
            if (!o) throw new Error(`no object ${key}`);
            return Buffer.from(o.data);
        },
        async put(key, data, contentType) {
            check(this);
            if (this.failPut(key)) throw new Error(`put ${key} failed`);
            objects.set(key, { data: Buffer.from(data), contentType, cacheControl: "public, max-age=31536000, immutable" });
        },
        async delete(keys) {
            check(this);
            if (this.failDelete) throw new Error("delete failed");
            for (const k of keys) objects.delete(k);
        },
        async link(key) {
            return `http://storage.test/vmenu-photos/${key}?X-Amz-Signature=test`;
        },
        async isUp() {
            return !this.down;
        },
    };
}

/** VM-15: order-service, mocked: no table has an unpaid bill. */
export const NO_OPEN_BILLS = { hasOpenBill: async () => false };
