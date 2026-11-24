import { assertId, badRequest, notFound } from "@vmenu/common";
import type { ImagesRepo } from "../repositories/images.repo.js";
import type { ItemFields, ItemsRepo } from "../repositories/items.repo.js";
import { flag, str, type Body } from "./input.js";
import { imageIdOf, isOwnImage, PLACEHOLDER } from "./photos.js";

interface Restaurant {
    _id: string;
    slug: string;
}

// Only these fields can be set from a request body (no resId or _id smuggling).
// The image must be one of this restaurant's uploaded photos (SEC-05), so an item can't point
// customers' browsers at an outside server. An item's existing image may be sent back unchanged.
function itemFields(body: Body, partial: boolean, slug: string, currentImage?: string): ItemFields {
    const b = body ?? {};
    const out: ItemFields = {};
    const name = str(b.name, 120);
    const image = str(b.image, 2000);
    const price = Number(b.price);
    if (name) out.name = name;
    if (image && image !== currentImage) {
        if (image !== PLACEHOLDER && !isOwnImage(image, slug))
            throw badRequest("Upload the photo first; the image must be this restaurant's own photo");
        out.image = image;
    }
    if (b.price !== undefined && Number.isFinite(price) && price >= 0) out.price = price;
    if (typeof b.isEnabled === "boolean") out.isEnabled = b.isEnabled;
    if (!partial && (!out.name || !out.image || out.price === undefined)) throw badRequest("Name, price and image are required");
    return out;
}

/** The menu: dishes, their prices and photos, and whether they're on (CL-04). */
export function itemsService({ items, images }: { items: ItemsRepo; images: ImagesRepo }) {
    /** Deletes a replaced or removed item's photo if it is one of ours. Never fails the request. */
    async function dropPhoto(url: string, restaurant: Restaurant) {
        if (!isOwnImage(url, restaurant.slug)) return;
        try {
            await images.remove(restaurant._id, imageIdOf(url));
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
        /** What customers see: the dishes that are on. */
        publicList: (resId: string) => items.list(resId, { enabledOnly: true }),

        list: (resId: string) => items.list(resId),

        async create(restaurant: Restaurant, body: Body) {
            const fields = itemFields(body, false, restaurant.slug) as Required<Pick<ItemFields, "name" | "price" | "image">>;
            return items.create(restaurant._id, fields);
        },

        async update(restaurant: Restaurant, id: string, body: Body) {
            const before = await existing(restaurant._id, id);
            const updated = await items.update(restaurant._id, id, itemFields(body, true, restaurant.slug, before.image));
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
        async setEnabled(resId: string, id: string, body: Body) {
            await existing(resId, id); // 400 for a bad id, 404 for another restaurant's, as before
            const item = await items.update(resId, id, { isEnabled: flag(body) });
            if (!item) throw notFound("Menu item not found");
            return item;
        },
    };
}
