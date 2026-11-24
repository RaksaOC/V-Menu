import sharp from "sharp";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import {
    app,
    cashier,
    confirm,
    gpsPhoto,
    idOf,
    lookupRestaurant,
    OTHER,
    OTHER_ID,
    otherOwner,
    owner,
    photo,
    photos,
    RES_ID,
    sign,
    SLUG,
    small,
    upload,
    usePhotoApi,
} from "./photo-api.js";

// VM-02 (menu photos are uploaded, not sent as base64), SEC-05 (the upload is safe) and PHOTOS-S3
// (the photo goes straight from the browser to object storage with a signed form; the service
// checks it and keeps a re-encoded copy). Object storage is in memory here; minio.test.ts runs
// the same steps against a real MinIO. Serving, clean-up and metrics: images-serving.test.ts.
usePhotoApi("menu-images");

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
