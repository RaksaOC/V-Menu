import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import multer from "multer";
import sharp from "sharp";
import { badRequest, HttpError } from "@vmenu/common";

// Menu photos (VM-02), made safe (SEC-05):
//   - the real type is read from the file's first bytes; only JPEG, PNG and WebP (never SVG)
//   - every photo is re-encoded with sharp: at most 800 px wide, WebP, and with no EXIF data
//     (phone photos carry the GPS location) and nothing appended to the file
//   - stored in MongoDB GridFS, so no new infrastructure; served with a long cache and nosniff

export const MAX_BYTES = 5 * 1024 * 1024;
const MAX_WIDTH = 800;
const MAX_PIXELS = 40_000_000; // refuses "decompression bombs" before decoding them

type Kind = "jpeg" | "png" | "webp";

/** The image type from the file's magic bytes, or null. The name and Content-Type are ignored. */
export function sniff(buf: Buffer): Kind | null {
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
    if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
    if (buf.length >= 12 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return "webp";
    return null;
}

const notAPhoto = () => new HttpError(415, "Please choose a JPG, PNG or WebP photo");

/** Re-encodes a photo to WebP, at most 800 px wide, turned the right way up, with no metadata. */
export async function reencode(buf: Buffer): Promise<Buffer> {
    if (!sniff(buf)) throw notAPhoto();
    try {
        return await sharp(buf, { limitInputPixels: MAX_PIXELS, failOn: "error" })
            .rotate() // applies the EXIF orientation before the EXIF is dropped
            .resize({ width: MAX_WIDTH, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer(); // sharp keeps no metadata unless asked to
    } catch {
        throw notAPhoto(); // starts like a photo but isn't one
    }
}

/** Reads one file field called "image" into memory, with the size limit as a 413. */
const parser = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1, fields: 5 } }).single("image");
export function receivePhoto(req: Request, res: Response, next: NextFunction) {
    parser(req, res, (err: unknown) => {
        if (err instanceof multer.MulterError) {
            return next(
                err.code === "LIMIT_FILE_SIZE"
                    ? new HttpError(413, "Photos can be at most 5 MB")
                    : badRequest('Send one photo in the "image" field'),
            );
        }
        if (err) return next(err);
        if (!req.file) return next(badRequest('Send one photo in the "image" field'));
        next();
    });
}

const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db!, { bucketName: "images" });

export const imageUrl = (slug: string, id: string) => `/api/menu/${encodeURIComponent(slug)}/images/${id}`;

/** The frontend's own "no photo" picture, which an item may use until a photo is uploaded. */
export const PLACEHOLDER = "/images/img.png";

/** True when `url` is one of this restaurant's uploaded photos. */
export function isOwnImage(url: string, slug: string): boolean {
    const prefix = `/api/menu/${encodeURIComponent(slug)}/images/`;
    return url.startsWith(prefix) && /^[a-f0-9]{24}$/.test(url.slice(prefix.length));
}

export async function saveImage(webp: Buffer, resId: string): Promise<string> {
    const id = new mongoose.mongo.ObjectId();
    await new Promise<void>((resolve, reject) => {
        bucket()
            .openUploadStreamWithId(id, `${id}.webp`, { metadata: { resId, contentType: "image/webp" } })
            .on("finish", () => resolve())
            .on("error", reject)
            .end(webp);
    });
    return String(id);
}

/** Streams a restaurant's photo, or 404 when it isn't that restaurant's. */
export async function sendImage(res: Response, id: string, resId: string) {
    const _id = new mongoose.mongo.ObjectId(id);
    const file = await bucket().find({ _id, "metadata.resId": resId }).next();
    if (!file) throw new HttpError(404, "Image not found");
    res.set({
        "Content-Type": "image/webp",
        "Content-Length": String(file.length),
        "Cache-Control": "public, max-age=31536000, immutable", // the id changes when the photo does
        "X-Content-Type-Options": "nosniff",
    });
    await new Promise<void>((resolve, reject) => {
        bucket().openDownloadStream(_id).on("error", reject).on("end", resolve).pipe(res);
    });
}

/** Deletes a replaced or removed item's photo if it is one of ours. Never fails the request. */
export async function removeImage(url: string | undefined | null, slug: string, resId: string) {
    if (!url || !isOwnImage(url, slug)) return;
    const _id = new mongoose.mongo.ObjectId(url.slice(url.lastIndexOf("/") + 1));
    try {
        const file = await bucket().find({ _id, "metadata.resId": resId }).next();
        if (file) await bucket().delete(_id);
    } catch {
        /* a leftover file is harmless */
    }
}
