import { assertId, HttpError } from "@vmenu/common";
import type { ImagesRepo } from "../repositories/images.repo.js";
import { imageUrl, reencode } from "./photos.js";

/** Uploading and serving menu photos (VM-02, SEC-05, CL-04). */
export function imagesService({ images }: { images: ImagesRepo }) {
    return {
        /** Re-encodes the upload and stores it; answers the short URL to save on the item. */
        async upload(restaurant: { _id: string; slug: string }, file: Buffer) {
            const id = await images.save(await reencode(file), String(restaurant._id));
            return { url: imageUrl(restaurant.slug, id) };
        },

        /** One of this restaurant's photos, as a stream, or 404. */
        async open(resId: string, id: string) {
            assertId(id, "image id");
            const file = await images.find(resId, id);
            if (!file) throw new HttpError(404, "Image not found");
            return { length: file.length, stream: images.stream(id) };
        },
    };
}
