import { assertId, badRequest, HttpError, notFound } from "@vmenu/common";
import { OTHER_CATEGORY, type CreateItemBody, type MenuSection, type PublicMenu, type UpdateItemBody } from "@vmenu/contracts";
import type { CategoriesRepo } from "../repositories/categories.repo.js";
import type { ItemRecord, ItemsRepo } from "../repositories/items.repo.js";
import { imageIdOf, isOwnImage, PLACEHOLDER } from "./photos.js";

interface Restaurant {
    _id: string;
    slug: string;
}

// The image must be one of this restaurant's uploaded photos (SEC-05), so an item can't point
// customers' browsers at an outside server. The body's shape is checked by the route (CL-05).
function checkPhoto(image: string, slug: string) {
    if (image !== PLACEHOLDER && !isOwnImage(image, slug))
        throw badRequest("Upload the photo first; the image must be this restaurant's own photo");
}

/** The menu: dishes, their prices and photos, and whether they're on (CL-04). */
/** PHOTOS-S3: deletes one of the restaurant's photos, wherever it is kept (images.service.ts). */
interface PhotoRemover {
    remove(resId: string, id: string): Promise<void>;
}

export function itemsService({ items, photos, categories }: { items: ItemsRepo; photos: PhotoRemover; categories: CategoriesRepo }) {
    /** VM-25: a dish's category must be one of this restaurant's (null is "Other"). */
    async function checkCategory(resId: string, categoryId: string | null | undefined) {
        if (!categoryId) return;
        if (!(await categories.get(resId, categoryId)))
            throw new HttpError(400, "Unknown category", "INVALID_INPUT", { categoryId: "Unknown category" });
    }

    /** Deletes a replaced or removed item's photo if it is one of ours and no other dish shows it.
     *  Never fails the request. */
    async function dropPhoto(url: string, restaurant: Restaurant) {
        if (!isOwnImage(url, restaurant.slug)) return;
        try {
            if ((await items.countWithImage(restaurant._id, url)) > 0) return;
            await photos.remove(restaurant._id, imageIdOf(url));
        } catch {
            /* a leftover file is harmless */
        }
    }

    async function existing(resId: string, id: string) {
        assertId(id, "item id");
        const item = await items.get(resId, id);
        if (!item) throw notFound("Menu item not found");
        return item;
    }

    return {
        /** What customers see (VM-25): the dishes by category in the owner's order, by name within
         *  one; empty categories left out; dishes with no category last, as "Other". VM-26: a dish
         *  that's off stays on the menu, after the others, for the page to show as sold out. */
        async publicMenu(resId: string): Promise<PublicMenu> {
            const [all, sections] = await Promise.all([items.list(resId), categories.list(resId)]);
            const inMenuOrder = (a: ItemRecord, b: ItemRecord) => Number(b.isEnabled) - Number(a.isEnabled) || a.name.localeCompare(b.name);
            const known = new Set(sections.map((c) => String(c._id)));
            const grouped: MenuSection[] = sections.map((c) => ({
                _id: String(c._id),
                name: c.name,
                items: all.filter((i) => i.categoryId === String(c._id)).sort(inMenuOrder),
            }));
            grouped.push({
                _id: null,
                name: OTHER_CATEGORY,
                items: all.filter((i) => !i.categoryId || !known.has(i.categoryId)).sort(inMenuOrder),
            });
            return { categories: grouped.filter((s) => s.items.length > 0) };
        },

        list: (resId: string) => items.list(resId),

        async create(restaurant: Restaurant, body: CreateItemBody) {
            checkPhoto(body.image, restaurant.slug);
            await checkCategory(restaurant._id, body.categoryId);
            return items.create(restaurant._id, body);
        },

        async update(restaurant: Restaurant, id: string, body: UpdateItemBody) {
            const before = await existing(restaurant._id, id);
            const fields = { ...body };
            // an item's existing image may be sent back unchanged
            if (fields.image === before.image) delete fields.image;
            else if (fields.image !== undefined) checkPhoto(fields.image, restaurant.slug);
            await checkCategory(restaurant._id, fields.categoryId);
            const updated = await items.update(restaurant._id, id, fields);
            if (!updated) throw notFound("Menu item not found");
            if (updated.image !== before.image) await dropPhoto(before.image, restaurant);
            return updated;
        },

        async remove(restaurant: Restaurant, id: string) {
            assertId(id, "item id");
            const removed = await items.remove(restaurant._id, id);
            if (!removed) throw notFound("Menu item not found");
            await dropPhoto(removed.image, restaurant);
            return removed;
        },

        /** Cashier or owner switches a dish on or off. */
        async setEnabled(resId: string, id: string, isEnabled: boolean) {
            await existing(resId, id); // 400 for a bad id, 404 for another restaurant's, as before
            const item = await items.update(resId, id, { isEnabled });
            if (!item) throw notFound("Menu item not found");
            return item;
        },
    };
}
