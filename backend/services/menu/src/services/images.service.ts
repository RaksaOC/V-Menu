import { assertId, badRequest, HttpError, logger, notFound } from "@vmenu/common";
import type { ImagesRepo } from "../repositories/images.repo.js";
import type { PhotoStore } from "../repositories/photo-store.js";
import { imageUrl, MAX_BYTES, newPhotoId, newUploadKey, notAPhoto, photoKey, PHOTO_TYPES, reencode, uploadOwner } from "./photos.js";

interface Restaurant {
    _id: string;
    slug: string;
}

const tooBig = () => new HttpError(413, "Photos can be at most 5 MB");

/**
 * Menu photos (VM-02, SEC-05, CL-04), in object storage (PHOTOS-S3):
 * 1. signUpload: a signed form for one new key, incoming/<resId>/<random>; the browser posts the
 *    photo straight to storage with it;
 * 2. confirm: the service reads that upload, checks and re-encodes it, keeps it as
 *    photos/<resId>/<id>.webp and deletes the upload; answers the short URL saved on the dish;
 * 3. open: the short URL redirects to a signed link (or streams a photo still in GridFS).
 */
export function imagesService({ images, photos }: { images: ImagesRepo; photos: PhotoStore }) {
    /** Deletes an upload that will never be kept. The lifecycle rule gets it if this fails. */
    async function drop(key: string) {
        await photos.delete([key]).catch((err: unknown) => logger.warn({ err, key }, "could not delete a refused upload"));
    }

    return {
        /** Step 1. Only JPEG, PNG and WebP; storage enforces the type, the 5 MB and the 10 minutes. */
        async signUpload(restaurant: Restaurant, contentType: string) {
            if (!PHOTO_TYPES.includes(contentType)) throw notAPhoto();
            return photos.signUpload(newUploadKey(String(restaurant._id)), contentType, MAX_BYTES);
        },

        /** Step 3. The key must be an upload of this restaurant's; answers { url } as before. */
        async confirm(restaurant: Restaurant, key: string) {
            const resId = String(restaurant._id);
            const owner = uploadOwner(key);
            if (!owner) throw badRequest("Not an upload key");
            if (owner !== resId) throw notFound("Upload not found"); // another restaurant's: as if it didn't exist
            const size = await photos.size(key);
            if (size === null) throw new HttpError(410, "This upload has expired. Please choose the photo again.");
            if (size > MAX_BYTES) {
                await drop(key);
                throw tooBig(); // the signed form already stops this; belt and braces
            }
            let webp: Buffer;
            try {
                webp = await reencode(await photos.get(key));
            } catch (err) {
                if (err instanceof HttpError) await drop(key); // not a photo: never kept
                throw err;
            }
            const id = newPhotoId();
            await photos.put(photoKey(resId, id), webp, "image/webp");
            await drop(key);
            return { url: imageUrl(restaurant.slug, id) };
        },

        /** Where a photo is: a signed storage link, or (not moved yet) a GridFS stream. 404 when
         *  it isn't this restaurant's. */
        async open(resId: string, id: string): Promise<{ redirect: string } | { length: number; stream: NodeJS.ReadableStream }> {
            assertId(id, "image id");
            const key = photoKey(resId, id);
            if ((await photos.size(key)) !== null) return { redirect: await photos.link(key) };
            const file = await images.find(resId, id);
            if (!file) throw new HttpError(404, "Image not found");
            return { length: file.length, stream: images.stream(id) };
        },

        /** Deletes one of the restaurant's photos, in storage and any GridFS copy from before. */
        async remove(resId: string, id: string) {
            await photos.delete([photoKey(resId, id)]);
            await images.remove(resId, id);
        },

        isUp: () => photos.isUp(),
    };
}
