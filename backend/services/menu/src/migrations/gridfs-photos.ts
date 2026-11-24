import type { ImagesRepo } from "../repositories/images.repo.js";
import type { PhotoStore } from "../repositories/photo-store.js";
import { photoKey } from "../services/photos.js";

interface Log {
    info(obj: object, msg: string): void;
    warn(obj: object, msg: string): void;
}

/**
 * PHOTOS-S3: copies the photos still in MongoDB GridFS (VM-02) to object storage, under the same
 * ids (photos/<resId>/<id>.webp), so the short URLs saved on dishes keep working. Runs at startup.
 *
 * - Safe to run again: a photo is marked (metadata.movedTo) only once its copy is confirmed, by
 *   reading back its size; marked photos are skipped. A copy already in storage with the right
 *   size (a run that stopped half way) is just marked.
 * - Nothing is deleted. GridFS keeps every file for one release (rollback); the deploy notes say
 *   how to drop them after that.
 */
export async function movePhotosToStorage(images: ImagesRepo, photos: PhotoStore, log: Log) {
    const result = { moved: 0, alreadyThere: 0, failed: 0 };
    for (const file of await images.unmoved()) {
        const key = photoKey(file.resId, file.id);
        try {
            if ((await photos.size(key)) === file.length) {
                await images.markMoved(file.id, key);
                result.alreadyThere++;
                continue;
            }
            await photos.put(key, await images.read(file.id), "image/webp");
            const copied = await photos.size(key);
            if (copied !== file.length) throw new Error(`copy is ${copied ?? "missing"} bytes, expected ${file.length}`);
            await images.markMoved(file.id, key);
            result.moved++;
            log.info({ id: file.id, key, bytes: file.length }, "moved a photo from GridFS to object storage");
        } catch (err) {
            result.failed++;
            log.warn(
                { err, id: file.id, key },
                "could not move a photo from GridFS to object storage; it stays in GridFS and is tried again at the next start",
            );
        }
    }
    if (result.moved || result.alreadyThere || result.failed) log.info(result, "moved photos from GridFS to object storage");
    return result;
}
