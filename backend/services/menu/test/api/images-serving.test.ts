import mongoose from "mongoose";
import sharp from "sharp";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import {
    app,
    cashier,
    confirm,
    idOf,
    lookupRestaurant,
    OTHER,
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

// PHOTOS-S3: the short URL redirects to a signed storage link; photos are cleaned up with their
// dishes; /ready needs storage; uploads are counted (B10). Uploading: images.test.ts.
usePhotoApi("menu-images-serving");

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
