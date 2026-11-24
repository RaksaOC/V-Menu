import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { imagesService } from "../../src/services/images.service.js";
import { internalService } from "../../src/services/internal.service.js";
import { itemsService } from "../../src/services/items.service.js";
import { imageUrl, isOwnImage, photoKey, PLACEHOLDER, sniff } from "../../src/services/photos.js";
import { tablesService } from "../../src/services/tables.service.js";
import { fakeCategories, fakeImages, fakeItems, fakePhotoStore, fakeTables, newId, NO_OPEN_BILLS } from "./fakes.js";

// CL-04: menu-service's business rules, with in-memory repositories (no MongoDB, no HTTP).
const A = { _id: "665f00000000000000000001", slug: "rest-a" };
const B = { _id: "665f00000000000000000002", slug: "rest-b" };
const status = (p: Promise<unknown>) => p.then(() => 200).catch((e: { status?: number }) => e.status ?? 500);
const code = (p: Promise<unknown>) => p.then(() => null).catch((e: { code?: string }) => e.code);

function setup() {
    const items = fakeItems();
    const tables = fakeTables();
    const images = fakeImages();
    const store = fakePhotoStore();
    const photos = imagesService({ images, photos: store });
    return {
        items,
        tables,
        images,
        store,
        menu: itemsService({ items, photos, categories: fakeCategories() }),
        seating: tablesService({ tables }),
        photos,
        internal: internalService({ items, tables }),
    };
}

describe("items", () => {
    it("creates with the required fields, only this restaurant's photo, and lists them", async () => {
        const { menu, images } = setup();
        const photo = imageUrl(A.slug, await images.save(Buffer.from("x"), A._id));
        const item = await menu.create(A, { name: "Amok", priceCents: 500, image: photo });
        expect(item).toMatchObject({ name: "Amok", priceCents: 500, image: photo, resId: A._id, isEnabled: true });
        await menu.create(A, { name: "Hidden", priceCents: 100, image: PLACEHOLDER, isEnabled: false });
        expect((await menu.list(A._id)).map((i) => i.name)).toEqual(["Amok", "Hidden"]);
        // VM-26: a dish that's off stays on the customer's menu, as sold out, after the others
        expect((await menu.publicMenu(A._id)).categories.flatMap((c) => c.items.map((i) => [i.name, i.isEnabled]))).toEqual([
            ["Amok", true],
            ["Hidden", false],
        ]);
        expect(await menu.list(B._id)).toEqual([]);
    });

    it("refuses an image that isn't this restaurant's own photo (SEC-05); the body's shape is the route's job (CL-05)", async () => {
        const { menu } = setup();
        expect(await status(menu.create(A, { name: "Outside", priceCents: 200, image: "https://evil.example/x.png" }))).toBe(400);
        expect(await status(menu.create(A, { name: "B's photo", priceCents: 200, image: imageUrl(B.slug, "a".repeat(24)) }))).toBe(400);
        const item = await menu.create(A, { name: "A", priceCents: 100, image: PLACEHOLDER });
        expect(await status(menu.update(A, item._id, { image: "https://evil.example/y.png" }))).toBe(400);
    });

    it("updates only what is sent, and removes the old photo when it's replaced", async () => {
        const { menu, store, images } = setup();
        const oldId = newId();
        await store.put(photoKey(A._id, oldId), Buffer.from("old"), "image/webp");
        const legacyId = await images.save(Buffer.from("old"), A._id); // PHOTOS-S3: from before; its GridFS copy goes too
        const item = await menu.create(A, { name: "Amok", priceCents: 500, image: imageUrl(A.slug, oldId) });
        const same = await menu.update(A, item._id, { priceCents: 600, image: imageUrl(A.slug, oldId) }); // image sent back unchanged
        expect(same).toMatchObject({ name: "Amok", priceCents: 600 });
        expect(store.objects.has(photoKey(A._id, oldId))).toBe(true);
        const newId2 = newId();
        await menu.update(A, item._id, { image: imageUrl(A.slug, newId2), isEnabled: false });
        expect(store.objects.has(photoKey(A._id, oldId))).toBe(false);
        expect((await menu.list(A._id))[0]).toMatchObject({ priceCents: 600, isEnabled: false, image: imageUrl(A.slug, newId2) });
        await menu.update(A, item._id, { image: imageUrl(A.slug, legacyId) });
        await menu.update(A, item._id, { image: PLACEHOLDER });
        expect(images.files.has(legacyId)).toBe(false);
    });

    it("deletes the item and its photo; a failed photo delete doesn't fail the request", async () => {
        const { menu, store, images } = setup();
        const id = newId();
        await store.put(photoKey(A._id, id), Buffer.from("p"), "image/webp");
        const a = await menu.create(A, { name: "A", priceCents: 100, image: imageUrl(A.slug, id) });
        expect((await menu.remove(A, a._id)).name).toBe("A");
        expect(store.objects.has(photoKey(A._id, id))).toBe(false);
        const id2 = newId();
        await store.put(photoKey(A._id, id2), Buffer.from("q"), "image/webp");
        const b = await menu.create(A, { name: "B", priceCents: 100, image: imageUrl(A.slug, id2) });
        store.failDelete = true;
        images.failRemove = true;
        expect((await menu.remove(A, b._id)).name).toBe("B");
        const c = await menu.create(A, { name: "C", priceCents: 100, image: PLACEHOLDER });
        expect((await menu.remove(A, c._id)).name).toBe("C"); // the placeholder is not ours to delete
    });

    it("keeps a photo another dish of the restaurant still uses (PHOTOS-S3)", async () => {
        const { menu, store } = setup();
        const id = newId();
        await store.put(photoKey(A._id, id), Buffer.from("p"), "image/webp");
        const a = await menu.create(A, { name: "A", priceCents: 100, image: imageUrl(A.slug, id) });
        const b = await menu.create(A, { name: "B", priceCents: 100, image: imageUrl(A.slug, id) });
        await menu.remove(A, a._id);
        expect(store.objects.has(photoKey(A._id, id))).toBe(true);
        await menu.update(A, b._id, { image: PLACEHOLDER });
        expect(store.objects.has(photoKey(A._id, id))).toBe(false);
    });

    it("switches an item on and off; ids must be valid and this restaurant's", async () => {
        const { menu } = setup();
        const item = await menu.create(A, { name: "A", priceCents: 100, image: PLACEHOLDER });
        expect((await menu.setEnabled(A._id, item._id, false)).isEnabled).toBe(false);
        expect(await status(menu.setEnabled(B._id, item._id, true))).toBe(404);
        expect(await status(menu.update(B, item._id, { priceCents: 200 }))).toBe(404);
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
        expect(await status(seating.create(A._id, { type: "manual", name: "Patio" }))).toBe(409); // VM-16
        expect((await seating.list(A._id)).length).toBe(4);
    });

    it("renames (unless the name is taken), opens, closes and deletes", async () => {
        const { seating } = setup();
        const t1 = await seating.create(A._id, {});
        await seating.create(A._id, {});
        expect((await seating.update(A._id, t1._id, { name: "Window", isEnabled: true }, NO_OPEN_BILLS)).name).toBe("Window");
        expect((await seating.update(A._id, t1._id, { name: "Window" }, NO_OPEN_BILLS)).isEnabled).toBe(true); // same name is fine
        expect(await status(seating.update(A._id, t1._id, { name: "2" }, NO_OPEN_BILLS))).toBe(409); // VM-16
        expect((await seating.update(A._id, t1._id, {}, NO_OPEN_BILLS)).name).toBe("Window");
        expect((await seating.setEnabled(A._id, t1._id, false)).isEnabled).toBe(false);
        expect((await seating.remove(A._id, t1._id, NO_OPEN_BILLS)).name).toBe("Window");
        expect(await status(seating.remove(A._id, t1._id, NO_OPEN_BILLS))).toBe(404);
        expect(await status(seating.update(B._id, "bad", {}, NO_OPEN_BILLS))).toBe(400);
        expect(await status(seating.update(B._id, newId(), {}, NO_OPEN_BILLS))).toBe(404);
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

describe("table names stay unique when requests race (VM-16)", () => {
    it("5 automatic creates at the same time get 5 different names", async () => {
        const { seating, tables } = setup();
        await Promise.all(Array.from({ length: 5 }, () => seating.create(A._id, {})));
        expect(tables.all.map((t) => t.name).sort()).toEqual(["1", "2", "3", "4", "5"]);
    });

    it("a manual name taken between the check and the write is 409 NAME_TAKEN, and a rename too", async () => {
        const { seating, tables } = setup();
        const answers = await Promise.allSettled([
            seating.create(A._id, { type: "manual", name: "Patio" }),
            seating.create(A._id, { type: "manual", name: "Patio" }),
        ]);
        expect(answers.map((a) => a.status).sort()).toEqual(["fulfilled", "rejected"]);
        expect(answers.find((a) => a.status === "rejected")).toMatchObject({ reason: { status: 409, code: "NAME_TAKEN" } });
        const window = await seating.create(A._id, { type: "manual", name: "Window" });
        const findByName = tables.findByName;
        tables.findByName = async () => null; // as if "Patio" was taken after the check
        expect(await code(seating.update(A._id, window._id, { name: "Patio" }, NO_OPEN_BILLS))).toBe("NAME_TAKEN");
        tables.findByName = findByName;
    });

    it("gives up with 409 after 10 tries, and passes other errors on", async () => {
        const { seating, tables } = setup();
        const { TableNameTaken } = await import("../../src/repositories/tables.repo.js");
        let tries = 0;
        tables.create = async () => {
            tries++;
            throw new TableNameTaken("1");
        };
        expect(await status(seating.create(A._id, {}))).toBe(409);
        expect(tries).toBe(10);
        tables.create = async () => {
            throw new Error("database down");
        };
        expect(await status(seating.create(A._id, {}))).toBe(500);
        expect(await status(seating.create(A._id, { type: "manual", name: "Bar" }))).toBe(500);
    });
});

describe("photos (PHOTOS-S3)", () => {
    const png = () =>
        sharp({ create: { width: 4, height: 4, channels: 3, background: "red" } })
            .png()
            .toBuffer();

    it("signs a form for a new incoming key of this restaurant, for photo types only", async () => {
        const { photos, store } = setup();
        const form = await photos.signUpload(A, "image/png");
        expect(form.key).toMatch(new RegExp(`^incoming/${A._id}/[0-9a-f]{32}$`));
        expect(store.signed[0]).toMatchObject({ key: form.key, maxBytes: 5 * 1024 * 1024 });
        expect(await status(photos.signUpload(A, "image/svg+xml"))).toBe(415);
    });

    it("confirms an upload: re-encoded to WebP under photos/<restaurant>/<id>.webp; serves only this restaurant's photos", async () => {
        const { photos, store } = setup();
        const form = await photos.signUpload(A, "image/png");
        store.browserPost(form.key, await png(), "image/png");
        const { url } = await photos.confirm(A, form.key);
        expect(isOwnImage(url, A.slug)).toBe(true);
        const id = url.slice(url.lastIndexOf("/") + 1);
        expect(sniff(store.objects.get(photoKey(A._id, id))!.data)).toBe("webp");
        expect(store.objects.has(form.key)).toBe(false);
        expect(await photos.open(A._id, id)).toEqual({ redirect: expect.stringContaining(photoKey(A._id, id)) });
        expect(await status(photos.open(B._id, id))).toBe(404);
        expect(await status(photos.open(A._id, "nope"))).toBe(400);
    });

    it("refuses another restaurant's key, a non-upload key, an expired one, a non-photo and a big file", async () => {
        const { photos, store } = setup();
        const form = await photos.signUpload(A, "image/png");
        store.browserPost(form.key, await png(), "image/png");
        expect(await status(photos.confirm(B, form.key))).toBe(404);
        expect(store.objects.has(form.key)).toBe(true);
        expect(await status(photos.confirm(A, "photos/x"))).toBe(400);
        expect(await status(photos.confirm(A, `incoming/${A._id}/${"0".repeat(32)}`))).toBe(410);
        const svg = await photos.signUpload(A, "image/png");
        store.browserPost(svg.key, Buffer.from("<svg/>"));
        expect(await status(photos.confirm(A, svg.key))).toBe(415);
        expect(store.objects.has(svg.key)).toBe(false);
        const big = await photos.signUpload(A, "image/jpeg");
        store.browserPost(big.key, Buffer.alloc(5 * 1024 * 1024 + 1));
        expect(await status(photos.confirm(A, big.key))).toBe(413);
        expect(store.objects.has(big.key)).toBe(false);
    });

    it("a photo not yet moved from GridFS is streamed from there", async () => {
        const { photos, images } = setup();
        const id = await images.save(Buffer.from("RIFF0000WEBP"), A._id);
        const file = await photos.open(A._id, id);
        expect(file).toMatchObject({ length: 12 });
        expect(await status(photos.open(B._id, id))).toBe(404);
    });

    it("is ready only when storage answers", async () => {
        const { photos, store } = setup();
        expect(await photos.isUp()).toBe(true);
        store.down = true;
        expect(await photos.isUp()).toBe(false);
    });
});

describe("internal: counts and the order check", () => {
    async function seeded() {
        const s = setup();
        const open = await s.seating.create(A._id, {});
        await s.seating.setEnabled(A._id, open._id, true);
        await s.seating.create(A._id, {}); // table 2, closed
        const dish = await s.menu.create(A, { name: "Amok", priceCents: 500, image: PLACEHOLDER });
        const off = await s.menu.create(A, { name: "Off", priceCents: 100, image: PLACEHOLDER, isEnabled: false });
        return { ...s, dish, off };
    }

    it("counts tables, open tables and dishes", async () => {
        const { internal } = await seeded();
        expect(await internal.counts(A._id)).toEqual({ numOfTables: 2, numOfActiveTables: 1, numOfItems: 2 });
    });

    it("prices the cart from the menu", async () => {
        const { internal, dish } = await seeded();
        const res = await internal.orderCheck(A._id, { table: "1", items: [{ _id: dish._id, quantity: 2 }] });
        expect(res.items).toEqual([
            { item: { _id: dish._id, name: "Amok", priceCents: 500, price: 5, image: PLACEHOLDER, isEnabled: true }, quantity: 2 },
        ]);
    });

    it("refuses a closed table and dishes that are off (a bad cart is refused by the route, CL-05)", async () => {
        const { internal, dish, off } = await seeded();
        expect(await code(internal.orderCheck(A._id, { table: "2", items: [{ _id: dish._id, quantity: 1 }] }))).toBe("TABLE_CLOSED");
        expect(await code(internal.orderCheck(A._id, { table: "9", items: [{ _id: dish._id, quantity: 1 }] }))).toBe("TABLE_CLOSED");
        expect(await code(internal.orderCheck(A._id, { table: "1", items: [{ _id: off._id, quantity: 1 }] }))).toBe("ITEMS_UNAVAILABLE");
    });
});
