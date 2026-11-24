import mongoose from "mongoose";
import sharp from "sharp";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { fakeRestaurantLookup, startMemoryMongo, tokenFor } from "@vmenu/common/testing";
import { createApp } from "../../src/app.js";
import { fakePhotoStore } from "../unit/fakes.js";

// VM-02 (menu photos are uploaded, not sent as base64), SEC-05 (the upload is safe) and PHOTOS-S3
// (the photo goes straight from the browser to object storage with a signed form; the service
// checks it, keeps a re-encoded copy and redirects image links to storage). Object storage is in
// memory here; test/api/minio.test.ts runs the same steps against a real MinIO.
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";

const RESTAURANTS = {
    "mee-keav-abc123": { _id: "665f00000000000000000001", name: "Mee Keav", slug: "mee-keav-abc123", ownerId: "owner1" },
    "other-xyz789": { _id: "665f00000000000000000002", name: "Other", slug: "other-xyz789", ownerId: "owner2" },
};
const lookupRestaurant = fakeRestaurantLookup(RESTAURANTS);
let photos = fakePhotoStore();
let app = createApp({ lookupRestaurant, photos });
const SLUG = "mee-keav-abc123";
const OTHER = "other-xyz789";
const RES_ID = RESTAURANTS[SLUG]._id;
const OTHER_ID = RESTAURANTS[OTHER]._id;

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
let owner: Record<string, string>, cashier: Record<string, string>, otherOwner: Record<string, string>;
let photo: Buffer, gpsPhoto: Buffer, small: Buffer;
beforeAll(async () => {
    mongo = await startMemoryMongo("menu");
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

/** Step 1: the signed form. */
const sign = (contentType = "image/jpeg", headers = owner, slug = SLUG, a = app) =>
    request(a).post(`/api/menu/${slug}/images/uploads`).set(headers).send({ contentType });
/** Step 3: the key back to the service. */
const confirm = (key: string, headers = owner, slug = SLUG, a = app) =>
    request(a).post(`/api/menu/${slug}/images`).set(headers).send({ key });
/** All three steps, with the browser's post to storage in the middle. */
async function upload(file: Buffer, contentType = "image/jpeg", headers = owner, slug = SLUG, a = app) {
    const form = await sign(contentType, headers, slug, a);
    if (form.status !== 201) return form;
    photos.browserPost(form.body.key, file, contentType);
    return confirm(form.body.key, headers, slug, a);
}
const idOf = (url: string) => url.slice(url.lastIndexOf("/") + 1);

describe("step 1: the signed upload form (PHOTOS-S3)", () => {
    it("gives the owner a form for one new incoming key of their restaurant", async () => {
        const res = await sign("image/png");
        expect(res.status).toBe(201);
        expect(res.body.key).toMatch(new RegExp(`^incoming/${RES_ID}/[0-9a-f]{32}$`));
        expect(res.body.url).toBe("http://storage.test/vmenu-photos");
        expect(res.body.fields).toMatchObject({ key: res.body.key, "Content-Type": "image/png" });
        expect(res.body.maxBytes).toBe(5 * 1024 * 1024);
        expect(Date.parse(res.body.expiresAt)).toBeGreaterThan(Date.now());
        expect(photos.signed[0]).toMatchObject({ key: res.body.key, maxBytes: 5 * 1024 * 1024 });
        expect((await sign("image/png")).body.key).not.toBe(res.body.key);
    });

    it("signs only JPEG, PNG and WebP (415 otherwise), and needs a type", async () => {
        expect((await sign("image/webp")).status).toBe(201);
        const svg = await sign("image/svg+xml");
        expect(svg.status).toBe(415);
        expect(svg.body.message).toMatch(/JPG, PNG or WebP/);
        expect((await sign("text/html")).status).toBe(415);
        expect((await request(app).post(`/api/menu/${SLUG}/images/uploads`).set(owner).send({})).status).toBe(400);
        expect(photos.signed).toHaveLength(1);
    });

    it("only the restaurant's owner gets a form", async () => {
        expect((await sign("image/jpeg", {})).status).toBe(401);
        expect((await sign("image/jpeg", cashier)).status).toBe(403);
        expect((await sign("image/jpeg", otherOwner)).status).toBe(403);
        expect(photos.signed).toHaveLength(0);
    });

    it("limits forms per restaurant per hour (SEC-05)", async () => {
        const limited = createApp({ lookupRestaurant, photos, uploadsPerHour: 2 });
        expect((await sign("image/jpeg", owner, SLUG, limited)).status).toBe(201);
        expect((await sign("image/jpeg", owner, SLUG, limited)).status).toBe(201);
        expect((await sign("image/jpeg", owner, SLUG, limited)).status).toBe(429);
        // another restaurant has its own allowance
        expect((await sign("image/jpeg", otherOwner, OTHER, limited)).status).toBe(201);
    });
});

describe("step 3: confirming the upload (PHOTOS-S3, VM-02)", () => {
    it("keeps a re-encoded WebP under photos/<restaurant>/<id>.webp, drops the upload, and answers the same short URL as before", async () => {
        expect(photo.length).toBeGreaterThan(500_000); // far over the old 2,000-character limit as base64
        const form = await sign();
        photos.browserPost(form.body.key, photo);
        const res = await confirm(form.body.key);
        expect(res.status).toBe(201);
        expect(res.body).toEqual({ url: expect.stringMatching(new RegExp(`^/api/menu/${SLUG}/images/[a-f0-9]{24}$`)) });
        expect(photos.objects.has(form.body.key)).toBe(false); // the incoming object is gone

        const kept = photos.objects.get(`photos/${RES_ID}/${idOf(res.body.url)}.webp`)!;
        expect(kept.contentType).toBe("image/webp");
        expect(kept.cacheControl).toBe("public, max-age=31536000, immutable");
        const meta = await sharp(kept.data).metadata();
        expect(meta.format).toBe("webp");
        expect(meta.width).toBe(800); // resized to at most 800 px wide
        expect(kept.data.length).toBeLessThan(photo.length);
        expect([...photos.objects.keys()]).toEqual([`photos/${RES_ID}/${idOf(res.body.url)}.webp`]);
    });

    it("one restaurant can't confirm another's upload: 404, and the upload stays its owner's", async () => {
        const form = await sign();
        photos.browserPost(form.body.key, photo);
        // the other owner, through their own restaurant
        const theirs = await confirm(form.body.key, otherOwner, OTHER);
        expect(theirs.status).toBe(404);
        expect(photos.objects.has(form.body.key)).toBe(true);
        expect([...photos.objects.keys()].some((k) => k.startsWith(`photos/${OTHER_ID}/`))).toBe(false);
        // and through the first restaurant, which isn't theirs
        expect((await confirm(form.body.key, otherOwner, SLUG)).status).toBe(403);
        expect((await confirm(form.body.key, cashier, SLUG)).status).toBe(403);
        expect((await confirm(form.body.key, {}, SLUG)).status).toBe(401);
        expect(photos.objects.has(form.body.key)).toBe(true);
        // the owner it was signed for still can
        expect((await confirm(form.body.key)).status).toBe(201);
    });

    it("refuses a key that isn't an upload key (400), and one that expired or was never posted (410)", async () => {
        for (const key of [`photos/${RES_ID}/${"a".repeat(24)}.webp`, `incoming/${RES_ID}/../../photos/x`, "incoming/x", ""]) {
            photos.browserPost(key, photo);
            expect((await confirm(key)).status).toBe(400);
        }
        expect((await request(app).post(`/api/menu/${SLUG}/images`).set(owner).send({})).status).toBe(400);
        const form = await sign(); // signed, but the browser never posted (or the lifecycle rule removed it)
        const gone = await confirm(form.body.key);
        expect(gone.status).toBe(410);
        expect(gone.body.message).toMatch(/expired/i);
    });

    it("a confirmed upload can't be confirmed twice", async () => {
        const form = await sign();
        photos.browserPost(form.body.key, small, "image/png");
        expect((await confirm(form.body.key)).status).toBe(201);
        expect((await confirm(form.body.key)).status).toBe(410);
    });

    it("refuses an upload over 5 MB with 413 and drops it (storage enforces the size too)", async () => {
        const form = await sign();
        photos.browserPost(form.body.key, Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(6 * 1024 * 1024)]));
        const res = await confirm(form.body.key);
        expect(res.status).toBe(413);
        expect(res.body.message).toMatch(/5 MB/);
        expect(photos.objects.has(form.body.key)).toBe(false);
    });

    it("a storage failure is a 500, and the upload is left for the clean-up rule", async () => {
        const form = await sign();
        photos.browserPost(form.body.key, small, "image/png");
        photos.failPut = () => true;
        expect((await confirm(form.body.key)).status).toBe(500);
        expect([...photos.objects.keys()]).toEqual([form.body.key]);
    });
});

describe("photo upload safety (SEC-05), after the browser's post", () => {
    it("checks the real file type: a PDF, an SVG or HTML posted as a JPEG is refused with 415 and dropped", async () => {
        const files = [
            Buffer.from("%PDF-1.7\n1 0 obj << >> endobj\n"),
            Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
            Buffer.from("<!doctype html><script>alert(1)</script>"),
            Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("not really an image")]),
        ];
        for (const file of files) {
            const form = await sign();
            photos.browserPost(form.body.key, file);
            const res = await confirm(form.body.key);
            expect(res.status).toBe(415);
            expect(photos.objects.has(form.body.key)).toBe(false);
        }
        expect(photos.objects.size).toBe(0);
    });

    it("re-encodes the photo, so the GPS location and other EXIF data are gone", async () => {
        expect((await sharp(gpsPhoto).metadata()).exif).toBeDefined();
        const { body } = await upload(gpsPhoto);
        const kept = photos.objects.get(`photos/${RES_ID}/${idOf(body.url)}.webp`)!.data;
        expect((await sharp(kept).metadata()).exif).toBeUndefined();
        expect(kept.includes(Buffer.from("PhoneCo"))).toBe(false);
    });

    it("an item's image must be one of this restaurant's uploaded photos", async () => {
        const add = (image: string) =>
            request(app).post(`/api/menu/${SLUG}/items`).set(owner).send({ name: "Amok", priceCents: 500, image });
        expect((await add("https://tracker.example/pixel.jpg")).status).toBe(400);
        expect((await add("data:image/jpeg;base64,/9j/4AAQ")).status).toBe(400);
        expect((await add(`/api/menu/${OTHER}/images/${"a".repeat(24)}`)).status).toBe(400);
        expect((await add(`/api/menu/${SLUG}/images/${"a".repeat(24)}`)).status).toBe(201);
        expect((await add("/images/img.png")).status).toBe(201); // the app's own "no photo" picture
    });

    it("an existing item keeps its old image when other fields are edited", async () => {
        // items made before this change may still point elsewhere; editing the name must not fail
        const { Item } = await import("../../src/models/item.model.js");
        const old = await Item.create({ name: "Old", priceCents: 100, image: "https://images.example/old.jpg", resId: RES_ID });
        const res = await request(app)
            .put(`/api/menu/${SLUG}/items/${old._id}`)
            .set(owner)
            .send({ name: "Renamed", priceCents: 100, image: "https://images.example/old.jpg" });
        expect(res.status).toBe(200);
        expect(res.body.name).toBe("Renamed");
        const swap = await request(app)
            .put(`/api/menu/${SLUG}/items/${old._id}`)
            .set(owner)
            .send({ image: "https://tracker.example/new.jpg" });
        expect(swap.status).toBe(400);
    });
});

describe("serving photos (PHOTOS-S3): the short URL redirects to a signed storage link", () => {
    it("redirects to the photo in storage, with a cache time shorter than the link's life", async () => {
        const { body } = await upload(photo);
        const res = await request(app).get(body.url);
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe(`http://storage.test/vmenu-photos/photos/${RES_ID}/${idOf(body.url)}.webp?X-Amz-Signature=test`);
        expect(res.headers["cache-control"]).toBe("public, max-age=3600");
    });

    it("an item saved with the uploaded URL shows on the customer menu", async () => {
        const { body } = await upload(photo);
        const item = await request(app).post(`/api/menu/${SLUG}/items`).set(owner).send({ name: "Amok", priceCents: 500, image: body.url });
        expect(item.status).toBe(201);
        const menu = await request(app).get(`/api/menu/${SLUG}/public/items`);
        expect(menu.body.categories[0].items[0].image).toBe(body.url); // VM-25: grouped
    });

    it("a photo is only served under its own restaurant", async () => {
        const { body } = await upload(photo);
        expect((await request(app).get(`/api/menu/${OTHER}/images/${idOf(body.url)}`)).status).toBe(404);
        expect((await request(app).get(`/api/menu/${SLUG}/images/${"c".repeat(24)}`)).status).toBe(404);
        expect((await request(app).get(`/api/menu/${SLUG}/images/not-an-id`)).status).toBe(400);
    });

    it("a GridFS photo that hasn't moved yet is still served from MongoDB", async () => {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db!, { bucketName: "images" });
        const id = new mongoose.mongo.ObjectId();
        const webp = await sharp(small).webp().toBuffer();
        await new Promise((resolve, reject) =>
            bucket
                .openUploadStreamWithId(id, `${id}.webp`, { metadata: { resId: RES_ID, contentType: "image/webp" } })
                .on("finish", resolve)
                .on("error", reject)
                .end(webp),
        );
        const res = await request(app)
            .get(`/api/menu/${SLUG}/images/${id}`)
            .buffer(true)
            .parse((r, cb) => {
                const chunks: Buffer[] = [];
                r.on("data", (c: Buffer) => chunks.push(c));
                r.on("end", () => cb(null, Buffer.concat(chunks)));
            });
        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toBe("image/webp");
        expect(res.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
        expect(res.headers["x-content-type-options"]).toBe("nosniff");
        expect(Buffer.compare(res.body as Buffer, webp)).toBe(0);
        expect((await request(app).get(`/api/menu/${OTHER}/images/${id}`)).status).toBe(404);
    });
});

describe("clean-up (PHOTOS-S3)", () => {
    const addItem = (name: string, image: string) =>
        request(app).post(`/api/menu/${SLUG}/items`).set(owner).send({ name, priceCents: 500, image });
    const keyOf = (url: string) => `photos/${RES_ID}/${idOf(url)}.webp`;

    it("deleting an item removes its photo from storage", async () => {
        const { body } = await upload(photo);
        const item = await addItem("Amok", body.url);
        expect((await request(app).delete(`/api/menu/${SLUG}/items/${item.body._id}`).set(owner)).status).toBe(200);
        expect(photos.objects.has(keyOf(body.url))).toBe(false);
    });

    it("keeps a photo another dish still uses", async () => {
        const { body } = await upload(photo);
        const a = await addItem("Amok", body.url);
        await addItem("Amok (large)", body.url);
        await request(app).delete(`/api/menu/${SLUG}/items/${a.body._id}`).set(owner);
        expect(photos.objects.has(keyOf(body.url))).toBe(true);
    });

    it("replacing an item's photo removes the old one", async () => {
        const first = (await upload(photo)).body.url;
        const second = (await upload(small, "image/png")).body.url;
        const item = await addItem("Amok", first);
        await request(app).put(`/api/menu/${SLUG}/items/${item.body._id}`).set(owner).send({ image: second });
        expect(photos.objects.has(keyOf(first))).toBe(false);
        expect(photos.objects.has(keyOf(second))).toBe(true);
    });

    it("another restaurant's delete never touches this restaurant's photo", async () => {
        const { body } = await upload(photo);
        await addItem("Amok", body.url);
        const theirs = await request(app)
            .post(`/api/menu/${OTHER}/items`)
            .set(otherOwner)
            .send({ name: "Copy", priceCents: 100, image: body.url });
        expect(theirs.status).toBe(400); // not their photo, so it can't be on their dish
        expect(photos.objects.has(keyOf(body.url))).toBe(true);
    });
});

describe("readiness (PHOTOS-S3)", () => {
    it("/ready needs object storage as well as MongoDB", async () => {
        const up = await request(app).get("/ready");
        expect(up.status).toBe(200);
        expect(up.body).toMatchObject({ status: "ok", db: true, storage: true });
        photos.down = true;
        const down = await request(app).get("/ready");
        expect(down.status).toBe(503);
        expect(down.body).toMatchObject({ status: "not ready", db: true, storage: false });
    });
});

describe("photo upload metrics (B10)", () => {
    const count = async (result: string) => {
        const res = await request(app).get("/metrics");
        const line = res.text.split("\n").find((l) => l.startsWith(`vmenu_image_uploads_total{result="${result}"} `));
        return line ? Number(line.split(" ").pop()) : 0;
    };

    it("lists every result from the start, so a dashboard's increase() doesn't miss the first one after a restart", async () => {
        const { text } = await request(app).get("/metrics");
        for (const result of ["ok", "not_a_photo", "too_large", "bad_request", "denied", "rate_limited", "error"])
            expect(text).toMatch(new RegExp(`^vmenu_image_uploads_total\\{result="${result}"\\} \\d+$`, "m"));
    });

    it("counts each upload once, by its result", async () => {
        const before = { ok: await count("ok"), wrong: await count("not_a_photo"), big: await count("too_large") };
        expect((await upload(photo)).status).toBe(201);
        expect((await upload(Buffer.from("%PDF-1.7 not a photo"))).status).toBe(415);
        expect((await upload(Buffer.alloc(6 * 1024 * 1024, 1))).status).toBe(413);
        expect((await sign("image/gif")).status).toBe(415);
        expect(await count("ok")).toBe(before.ok + 1);
        expect(await count("not_a_photo")).toBe(before.wrong + 2);
        expect(await count("too_large")).toBe(before.big + 1);
    });

    it("counts refused sign-ins and rate limits apart from bad files", async () => {
        const denied = await count("denied");
        expect((await sign("image/jpeg", cashier)).status).toBe(403);
        expect((await confirm(`incoming/${RES_ID}/${"0".repeat(32)}`, cashier)).status).toBe(403);
        expect(await count("denied")).toBe(denied + 2);
        const limited = createApp({ lookupRestaurant, photos, uploadsPerHour: 1 });
        const rateLimited = await count("rate_limited");
        await sign("image/jpeg", owner, SLUG, limited);
        expect((await sign("image/jpeg", owner, SLUG, limited)).status).toBe(429);
        expect(await count("rate_limited")).toBe(rateLimited + 1);
    });
});
