import { assertId, badRequest, notFound } from "@vmenu/common";
import type { ImagesRepo } from "../repositories/images.repo.js";
import type { CreateItemBody, UpdateItemBody } from "@vmenu/contracts";
import type { ItemsRepo } from "../repositories/items.repo.js";
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

        async create(restaurant: Restaurant, body: CreateItemBody) {
            checkPhoto(body.image, restaurant.slug);
            return items.create(restaurant._id, body);
        },

        async update(restaurant: Restaurant, id: string, body: UpdateItemBody) {
            const before = await existing(restaurant._id, id);
            const fields = { ...body };
            // an item's existing image may be sent back unchanged
            if (fields.image === before.image) delete fields.image;
            else if (fields.image !== undefined) checkPhoto(fields.image, restaurant.slug);
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
