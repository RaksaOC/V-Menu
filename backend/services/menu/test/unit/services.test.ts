import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { imagesService } from "../../src/services/images.service.js";
import { internalService } from "../../src/services/internal.service.js";
import { itemsService } from "../../src/services/items.service.js";
import { imageUrl, isOwnImage, PLACEHOLDER, sniff } from "../../src/services/photos.js";
import { tablesService } from "../../src/services/tables.service.js";
import { fakeImages, fakeItems, fakeTables, newId } from "./fakes.js";

// CL-04: menu-service's business rules, with in-memory repositories (no MongoDB, no HTTP).
const A = { _id: "665f00000000000000000001", slug: "rest-a" };
const B = { _id: "665f00000000000000000002", slug: "rest-b" };
const status = (p: Promise<unknown>) => p.then(() => 200).catch((e: { status?: number }) => e.status ?? 500);
const code = (p: Promise<unknown>) => p.then(() => null).catch((e: { code?: string }) => e.code);

function setup() {
    const items = fakeItems();
    const tables = fakeTables();
    const images = fakeImages();
    return {
        items,
        tables,
        images,
        menu: itemsService({ items, images }),
        seating: tablesService({ tables }),
        photos: imagesService({ images }),
        internal: internalService({ items, tables }),
    };
}

describe("items", () => {
    it("creates with the required fields, only this restaurant's photo, and lists them", async () => {
        const { menu, images } = setup();
        const photo = imageUrl(A.slug, await images.save(Buffer.from("x"), A._id));
        const item = await menu.create(A, { name: "Amok", price: 5, image: photo });
        expect(item).toMatchObject({ name: "Amok", price: 5, image: photo, resId: A._id, isEnabled: true });
        await menu.create(A, { name: "Hidden", price: 1, image: PLACEHOLDER, isEnabled: false });
        expect((await menu.list(A._id)).map((i) => i.name)).toEqual(["Amok", "Hidden"]);
        expect((await menu.publicList(A._id)).map((i) => i.name)).toEqual(["Amok"]);
        expect(await menu.list(B._id)).toEqual([]);
    });

    it("refuses an image that isn't this restaurant's own photo (SEC-05); the body's shape is the route's job (CL-05)", async () => {
        const { menu } = setup();
        expect(await status(menu.create(A, { name: "Outside", price: 2, image: "https://evil.example/x.png" }))).toBe(400);
        expect(await status(menu.create(A, { name: "B's photo", price: 2, image: imageUrl(B.slug, "a".repeat(24)) }))).toBe(400);
        const item = await menu.create(A, { name: "A", price: 1, image: PLACEHOLDER });
        expect(await status(menu.update(A, item._id, { image: "https://evil.example/y.png" }))).toBe(400);
    });

    it("updates only what is sent, and removes the old photo when it's replaced", async () => {
        const { menu, images } = setup();
        const oldId = await images.save(Buffer.from("old"), A._id);
        const item = await menu.create(A, { name: "Amok", price: 5, image: imageUrl(A.slug, oldId) });
        const same = await menu.update(A, item._id, { price: 6, image: imageUrl(A.slug, oldId) }); // image sent back unchanged
        expect(same).toMatchObject({ name: "Amok", price: 6 });
        expect(images.files.has(oldId)).toBe(true);
        const newId2 = await images.save(Buffer.from("new"), A._id);
        await menu.update(A, item._id, { image: imageUrl(A.slug, newId2), isEnabled: false });
        expect(images.files.has(oldId)).toBe(false);
        expect((await menu.list(A._id))[0]).toMatchObject({ price: 6, isEnabled: false, image: imageUrl(A.slug, newId2) });
    });

    it("deletes the item and its photo; a failed photo delete doesn't fail the request", async () => {
        const { menu, images } = setup();
        const id = await images.save(Buffer.from("p"), A._id);
        const a = await menu.create(A, { name: "A", price: 1, image: imageUrl(A.slug, id) });
        expect((await menu.remove(A, a._id)).name).toBe("A");
        expect(images.files.has(id)).toBe(false);
        const id2 = await images.save(Buffer.from("q"), A._id);
        const b = await menu.create(A, { name: "B", price: 1, image: imageUrl(A.slug, id2) });
        images.failRemove = true;
        expect((await menu.remove(A, b._id)).name).toBe("B");
        const c = await menu.create(A, { name: "C", price: 1, image: PLACEHOLDER });
        expect((await menu.remove(A, c._id)).name).toBe("C"); // the placeholder is not ours to delete
    });

    it("switches an item on and off; ids must be valid and this restaurant's", async () => {
        const { menu } = setup();
        const item = await menu.create(A, { name: "A", price: 1, image: PLACEHOLDER });
        expect((await menu.setEnabled(A._id, item._id, false)).isEnabled).toBe(false);
        expect(await status(menu.setEnabled(B._id, item._id, true))).toBe(404);
        expect(await status(menu.update(B, item._id, { price: 2 }))).toBe(404);
        expect(await status(menu.remove(B, item._id))).toBe(404);
        expect(await status(menu.update(A, "bad", {}))).toBe(400);
        expect(await status(menu.remove(A, "bad"))).toBe(400);
        expect(await status(menu.setEnabled(A._id, "bad", true))).toBe(400);
    });
});

describe("tables", () => {
    it("numbers new tables, takes a manual name, and starts them closed (VM-04)", async () => {
        const { seating } = setup();
        expect(await seating.create(A._id, {})).toMatchObject({ name: "1", isEnabled: false });
        expect((await seating.create(A._id, {})).name).toBe("2");
        expect((await seating.create(A._id, { type: "manual", name: "Patio" })).name).toBe("Patio");
        expect((await seating.create(A._id, {})).name).toBe("3"); // "Patio" isn't a number
        expect((await seating.create(B._id, {})).name).toBe("1");
        expect(await status(seating.create(A._id, { type: "manual", name: "Patio" }))).toBe(400);
        expect((await seating.list(A._id)).length).toBe(4);
    });

    it("renames (unless the name is taken), opens, closes and deletes", async () => {
        const { seating } = setup();
        const t1 = await seating.create(A._id, {});
        await seating.create(A._id, {});
        expect((await seating.update(A._id, t1._id, { name: "Window", isEnabled: true })).name).toBe("Window");
        expect((await seating.update(A._id, t1._id, { name: "Window" })).isEnabled).toBe(true); // same name is fine
        expect(await status(seating.update(A._id, t1._id, { name: "2" }))).toBe(400);
        expect((await seating.update(A._id, t1._id, {})).name).toBe("Window");
        expect((await seating.setEnabled(A._id, t1._id, false)).isEnabled).toBe(false);
        expect((await seating.remove(A._id, t1._id)).name).toBe("Window");
        expect(await status(seating.remove(A._id, t1._id))).toBe(404);
        expect(await status(seating.update(B._id, "bad", {}))).toBe(400);
        expect(await status(seating.update(B._id, newId(), {}))).toBe(404);
        expect(await status(seating.setEnabled(A._id, newId(), true))).toBe(404);
    });

    it("tells a customer whether their table is open, with a code the page can explain", async () => {
        const { seating } = setup();
        const t = await seating.create(A._id, {});
        expect(await code(seating.check(A._id, "1"))).toBe("TABLE_CLOSED");
        expect(await code(seating.check(A._id, "9"))).toBe("TABLE_NOT_FOUND");
        await seating.setEnabled(A._id, t._id, true);
        expect(await seating.check(A._id, "1")).toEqual({ message: "Table is available" });
    });
});

describe("photos", () => {
    it("re-encodes an upload to WebP and answers its URL; serves only this restaurant's photos", async () => {
        const { photos, images } = setup();
        const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "red" } })
            .png()
            .toBuffer();
        const { url } = await photos.upload(A, png);
        expect(isOwnImage(url, A.slug)).toBe(true);
        const id = url.slice(url.lastIndexOf("/") + 1);
        expect(sniff(images.files.get(id)!.data)).toBe("webp");
        const file = await photos.open(A._id, id);
        expect(file.length).toBeGreaterThan(0);
        expect(file.stream).toBeTruthy();
        expect(await status(photos.open(B._id, id))).toBe(404);
        expect(await status(photos.open(A._id, "nope"))).toBe(400);
        expect(await status(photos.upload(A, Buffer.from("<svg/>")))).toBe(415);
    });
});

describe("internal: counts and the order check", () => {
    async function seeded() {
        const s = setup();
        const open = await s.seating.create(A._id, {});
        await s.seating.setEnabled(A._id, open._id, true);
        await s.seating.create(A._id, {}); // table 2, closed
        const dish = await s.menu.create(A, { name: "Amok", price: 5, image: PLACEHOLDER });
        const off = await s.menu.create(A, { name: "Off", price: 1, image: PLACEHOLDER, isEnabled: false });
        return { ...s, dish, off };
    }

    it("counts tables, open tables and dishes", async () => {
        const { internal } = await seeded();
        expect(await internal.counts(A._id)).toEqual({ numOfTables: 2, numOfActiveTables: 1, numOfItems: 2 });
    });

    it("prices the cart from the menu", async () => {
        const { internal, dish } = await seeded();
        const res = await internal.orderCheck(A._id, { table: "1", items: [{ _id: dish._id, quantity: 2 }] });
        expect(res.items).toEqual([{ item: { _id: dish._id, name: "Amok", price: 5, image: PLACEHOLDER, isEnabled: true }, quantity: 2 }]);
    });

    it("refuses a closed table and dishes that are off (a bad cart is refused by the route, CL-05)", async () => {
        const { internal, dish, off } = await seeded();
        expect(await code(internal.orderCheck(A._id, { table: "2", items: [{ _id: dish._id, quantity: 1 }] }))).toBe("TABLE_CLOSED");
        expect(await code(internal.orderCheck(A._id, { table: "9", items: [{ _id: dish._id, quantity: 1 }] }))).toBe("TABLE_CLOSED");
        expect(await code(internal.orderCheck(A._id, { table: "1", items: [{ _id: off._id, quantity: 1 }] }))).toBe("ITEMS_UNAVAILABLE");
    });
});
