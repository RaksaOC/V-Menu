import mongoose from "mongoose";
import sharp from "sharp";
import request from "supertest";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { fakeRestaurantLookup, startMemoryMongo, tokenFor } from "@vmenu/common/testing";
import { createApp } from "../../src/app.js";
import { fakePhotoStore } from "../unit/fakes.js";

// Shared by the photo API tests (images.test.ts, images-serving.test.ts): two restaurants, their
// staff, test photos, object storage in memory and the three upload steps. The `let`s are live
// bindings: a test file sees the app and store its beforeEach made.
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";

export const RESTAURANTS = {
    "mee-keav-abc123": { _id: "665f00000000000000000001", name: "Mee Keav", slug: "mee-keav-abc123", ownerId: "owner1" },
    "other-xyz789": { _id: "665f00000000000000000002", name: "Other", slug: "other-xyz789", ownerId: "owner2" },
};
export const lookupRestaurant = fakeRestaurantLookup(RESTAURANTS);
export let photos = fakePhotoStore();
export let app = createApp({ lookupRestaurant, photos });
export const SLUG = "mee-keav-abc123";
export const OTHER = "other-xyz789";
export const RES_ID = RESTAURANTS[SLUG]._id;
export const OTHER_ID = RESTAURANTS[OTHER]._id;

export let owner: Record<string, string>, cashier: Record<string, string>, otherOwner: Record<string, string>;
export let photo: Buffer, gpsPhoto: Buffer, small: Buffer;
/** The hooks: a fresh database, store and app before each test. */
export function usePhotoApi(dbName: string) {
    let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
    beforeAll(async () => {
        mongo = await startMemoryMongo(dbName);
        owner = await tokenFor("owner", { ownerId: "owner1" });
        cashier = await tokenFor("cashier", { _id: RES_ID, slug: SLUG }, { uid: "c1" });
        otherOwner = await tokenFor("owner", { ownerId: "owner2" });
        // A 1600 x 1200 photo, like a phone's, and the same with a GPS location in its EXIF.
        const noise = Buffer.alloc(1600 * 1200 * 3);
        for (let i = 0, s = 7; i < noise.length; i++) noise[i] = (s = (s * 1103515245 + 12345) & 0x7fffffff) & 255;
        photo = await sharp(noise, { raw: { width: 1600, height: 1200, channels: 3 } })
            .jpeg({ quality: 70 })
            .toBuffer();
        gpsPhoto = await sharp(photo)
            .withExif({
                IFD0: { Make: "PhoneCo" },
                IFD3: { GPSLatitudeRef: "N", GPSLatitude: "11/1 33/1 25/1", GPSLongitudeRef: "E", GPSLongitude: "104/1 55/1 0/1" },
            })
            .jpeg()
            .toBuffer();
        small = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#f00" } })
            .png()
            .toBuffer();
    });
    afterAll(async () => {
        await mongo.stop();
    });
    beforeEach(async () => {
        await mongoose.connection.db!.dropDatabase();
        photos = fakePhotoStore();
        app = createApp({ lookupRestaurant, photos });
    });
}

/** Step 1: the signed form. */
export const sign = (contentType = "image/jpeg", headers = owner, slug = SLUG, a = app) =>
    request(a).post(`/api/menu/${slug}/images/uploads`).set(headers).send({ contentType });
/** Step 3: the key back to the service. */
export const confirm = (key: string, headers = owner, slug = SLUG, a = app) =>
    request(a).post(`/api/menu/${slug}/images`).set(headers).send({ key });
/** All three steps, with the browser's post to storage in the middle. */
export async function upload(file: Buffer, contentType = "image/jpeg", headers = owner, slug = SLUG, a = app) {
    const form = await sign(contentType, headers, slug, a);
    if (form.status !== 201) return form;
    photos.browserPost(form.body.key, file, contentType);
    return confirm(form.body.key, headers, slug, a);
}
export const idOf = (url: string) => url.slice(url.lastIndexOf("/") + 1);
