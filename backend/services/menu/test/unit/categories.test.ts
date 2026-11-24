import { describe, expect, it } from "vitest";
import { categoriesService } from "../../src/services/categories.service.js";
import { itemsService } from "../../src/services/items.service.js";
import { PLACEHOLDER } from "../../src/services/photos.js";
import { imagesService } from "../../src/services/images.service.js";
import { fakeCategories, fakeImages, fakeItems, fakePhotoStore, newId } from "./fakes.js";

// VM-25: menu categories. In-memory repositories, no MongoDB.
const A = { _id: "665f00000000000000000001", slug: "rest-a" };
const B = { _id: "665f00000000000000000002", slug: "rest-b" };
const status = (p: Promise<unknown>) => p.then(() => 200).catch((e: { status?: number }) => e.status ?? 500);
const fieldsOf = (p: Promise<unknown>) => p.then(() => null).catch((e: { fields?: object }) => e.fields);

function setup() {
    const items = fakeItems();
    const categories = fakeCategories();
    return {
        items,
        categories,
        sections: categoriesService({ categories, items }),
        menu: itemsService({ items, photos: imagesService({ images: fakeImages(), photos: fakePhotoStore() }), categories }),
    };
}
const dish = (name: string, categoryId?: string | null, isEnabled = true) => ({
    name,
    priceCents: 200,
    image: PLACEHOLDER,
    categoryId,
    isEnabled,
});

describe("categories", () => {
    it("are created in order, each after the last", async () => {
        const { sections } = setup();
        await sections.create(A._id, { name: "Mains" });
        await sections.create(A._id, { name: "Drinks" });
        expect((await sections.list(A._id)).map((c) => [c.name, c.sortOrder])).toEqual([
            ["Mains", 0],
            ["Drinks", 1],
        ]);
        expect(await sections.list(B._id)).toEqual([]);
    });

    it("refuse a name already used in this restaurant (any case), and Other, which is taken by the dishes with no category", async () => {
        const { sections } = setup();
        await sections.create(A._id, { name: "Drinks" });
        expect(await fieldsOf(sections.create(A._id, { name: "drinks" }))).toEqual({ name: "Name is taken" });
        expect(await fieldsOf(sections.create(A._id, { name: "other" }))).toEqual({ name: '"Other" is for dishes with no category' });
        expect(await status(sections.create(B._id, { name: "Drinks" }))).toBe(200); // another restaurant may
    });

    it("are renamed, keeping their place; another restaurant's is not found", async () => {
        const { sections } = setup();
        const mains = await sections.create(A._id, { name: "Mains" });
        const drinks = await sections.create(A._id, { name: "Drinks" });
        expect(await sections.rename(A._id, mains._id, { name: "Mains" })).toMatchObject({ name: "Mains" }); // same name is fine
        expect(await sections.rename(A._id, mains._id, { name: "Main dishes" })).toMatchObject({ name: "Main dishes", sortOrder: 0 });
        expect(await fieldsOf(sections.rename(A._id, mains._id, { name: "DRINKS" }))).toEqual({ name: "Name is taken" });
        expect(await status(sections.rename(B._id, drinks._id, { name: "Mine" }))).toBe(404);
        expect(await status(sections.rename(A._id, "nope", { name: "X" }))).toBe(400);
    });

    it("are reordered with every id once; a missing, repeated or foreign id is refused", async () => {
        const { sections } = setup();
        const [mains, drinks, desserts] = [
            await sections.create(A._id, { name: "Mains" }),
            await sections.create(A._id, { name: "Drinks" }),
            await sections.create(A._id, { name: "Desserts" }),
        ];
        const theirs = await sections.create(B._id, { name: "Theirs" });
        const order = await sections.reorder(A._id, { ids: [drinks._id, mains._id, desserts._id] });
        expect(order.map((c) => c.name)).toEqual(["Drinks", "Mains", "Desserts"]);
        expect(await status(sections.reorder(A._id, { ids: [drinks._id, mains._id] }))).toBe(400);
        expect(await status(sections.reorder(A._id, { ids: [drinks._id, drinks._id, mains._id] }))).toBe(400);
        expect(await status(sections.reorder(A._id, { ids: [drinks._id, mains._id, theirs._id] }))).toBe(400);
        expect((await sections.list(A._id)).map((c) => c.name)).toEqual(["Drinks", "Mains", "Desserts"]);
        expect((await sections.list(B._id))[0]!.sortOrder).toBe(0);
    });

    it("deleting one moves its dishes to Other, and leaves other restaurants' dishes alone", async () => {
        const { sections, menu, items } = setup();
        const drinks = await sections.create(A._id, { name: "Drinks" });
        const tea = await menu.create(A, dish("Tea", drinks._id));
        const theirs = await sections.create(B._id, { name: "Drinks" });
        await menu.create(B, dish("Their tea", theirs._id));
        await sections.remove(A._id, drinks._id);
        expect(await sections.list(A._id)).toEqual([]);
        expect(items.all.find((i) => i._id === tea._id)?.categoryId).toBeNull();
        expect(items.all.find((i) => i.name === "Their tea")?.categoryId).toBe(theirs._id);
        expect(await status(sections.remove(A._id, theirs._id))).toBe(404);
    });
});

describe("dishes in categories", () => {
    it("a dish can use this restaurant's category, or none, but never another restaurant's", async () => {
        const { sections, menu } = setup();
        const mine = await sections.create(A._id, { name: "Drinks" });
        const theirs = await sections.create(B._id, { name: "Drinks" });
        expect((await menu.create(A, dish("Tea", mine._id))).categoryId).toBe(mine._id);
        expect(await fieldsOf(menu.create(A, dish("Stolen", theirs._id)))).toEqual({ categoryId: "Unknown category" });
        expect(await fieldsOf(menu.create(A, dish("Ghost", newId())))).toEqual({ categoryId: "Unknown category" });
        const soup = await menu.create(A, dish("Soup"));
        expect(await fieldsOf(menu.update(A, soup._id, { categoryId: theirs._id }))).toEqual({ categoryId: "Unknown category" });
        expect((await menu.update(A, soup._id, { categoryId: mine._id })).categoryId).toBe(mine._id);
        expect((await menu.update(A, soup._id, { categoryId: null })).categoryId).toBeNull();
    });

    it("the public menu: categories in order, dishes by name with sold-out ones last (VM-26), empty ones left out, Other last", async () => {
        const { sections, menu } = setup();
        const mains = await sections.create(A._id, { name: "Mains" });
        const drinks = await sections.create(A._id, { name: "Drinks" });
        await sections.create(A._id, { name: "Desserts" }); // nothing in it
        await menu.create(A, dish("Iced Coffee", drinks._id));
        await menu.create(A, dish("Amok", mains._id));
        await menu.create(A, dish("Lok Lak", mains._id, false)); // off
        await menu.create(A, dish("Fried Rice", mains._id));
        await menu.create(A, dish("Bread"));
        await sections.reorder(A._id, { ids: [drinks._id, mains._id, (await sections.list(A._id))[2]!._id] });

        const { categories } = await menu.publicMenu(A._id);
        expect(categories.map((c) => [c._id, c.name, c.items.map((i) => i.name)])).toEqual([
            [drinks._id, "Drinks", ["Iced Coffee"]],
            [mains._id, "Mains", ["Amok", "Fried Rice", "Lok Lak"]],
            [null, "Other", ["Bread"]],
        ]);
        expect((await menu.publicMenu(B._id)).categories).toEqual([]);
    });
});
