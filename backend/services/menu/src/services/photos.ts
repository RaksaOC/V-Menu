import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { HttpError } from "@vmenu/common";

// Menu photos (VM-02), made safe (SEC-05):
//   - the real type is read from the file's first bytes; only JPEG, PNG and WebP (never SVG)
//   - every photo is re-encoded with sharp: at most 800 px wide, WebP, and with no EXIF data
//     (phone photos carry the GPS location) and nothing appended to the file
//   - PHOTOS-S3: kept in object storage (repositories/photo-store.ts) as photos/<resId>/<id>.webp,
//     with a year's cache; the short URL saved on a dish redirects to a signed link. Photos from
//     before are in MongoDB GridFS (repositories/images.repo.ts) until they're moved at startup.

export const MAX_BYTES = 5 * 1024 * 1024;
/** What a browser may upload (the signed form allows exactly one of these). */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
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

export const notAPhoto = () => new HttpError(415, "Please choose a JPG, PNG or WebP photo");

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

export const imageUrl = (slug: string, id: string) => `/api/menu/${encodeURIComponent(slug)}/images/${id}`;

/** The frontend's own "no photo" picture, which an item may use until a photo is uploaded. */
export const PLACEHOLDER = "/images/img.png";

/** True when `url` is one of this restaurant's uploaded photos. */
export function isOwnImage(url: string, slug: string): boolean {
    const prefix = `/api/menu/${encodeURIComponent(slug)}/images/`;
    return url.startsWith(prefix) && /^[a-f0-9]{24}$/.test(url.slice(prefix.length));
}

/** The photo id in one of our photo URLs. */
export const imageIdOf = (url: string) => url.slice(url.lastIndexOf("/") + 1);

// PHOTOS-S3: object storage keys. An upload key carries its restaurant, so one restaurant can't
// confirm another's upload: the form is signed for exactly this key, and confirming checks it.
const UPLOAD_KEY = /^incoming\/([0-9a-f]{24})\/[0-9a-f]{32}$/;

/** A new key for one browser upload: incoming/<resId>/<32 random hex>. */
export const newUploadKey = (resId: string) => `incoming/${resId}/${randomBytes(16).toString("hex")}`;

/** The restaurant an upload key was made for, or null when it isn't an upload key. */
export const uploadOwner = (key: string) => UPLOAD_KEY.exec(key)?.[1] ?? null;

/** Where a checked photo is kept. The id is the one in its short URL. */
export const photoKey = (resId: string, id: string) => `photos/${resId}/${id}.webp`;

/** A new photo id: 24 hex characters, like the GridFS ids before it, so the URL looks the same. */
export const newPhotoId = () => randomBytes(12).toString("hex");
