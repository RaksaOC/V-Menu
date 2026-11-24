import { randomBytes } from "node:crypto";
import {
    DeleteBucketCommand,
    DeleteObjectCommand,
    GetBucketLifecycleConfigurationCommand,
    HeadBucketCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    S3Client,
} from "@aws-sdk/client-s3";
import mongoose from "mongoose";
import sharp from "sharp";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fakeRestaurantLookup, startMemoryMongo, tokenFor } from "@vmenu/common/testing";
import { createApp } from "../../src/app.js";
import { minioPhotoStore, storageConfig } from "../../src/repositories/photo-store.js";

// PHOTOS-S3 against a real MinIO: the browser's post with the signed form, the size and type the
// form allows, confirming, the image link, the clean-up rule and deleting. CI starts the compose
// file's MinIO for this (ci.yml); locally, point S3_TEST_ENDPOINT at your own, e.g.
//   S3_TEST_ENDPOINT=http://127.0.0.1:9400 npx vitest run test/api/minio.test.ts
// Without S3_TEST_ENDPOINT it is skipped, except in CI, where it must run.
const ENDPOINT = process.env.S3_TEST_ENDPOINT;
if (process.env.CI && !ENDPOINT) throw new Error("CI must run the MinIO tests: set S3_TEST_ENDPOINT (ci.yml starts MinIO)");

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";
const R = { _id: "665f00000000000000000001", name: "Mee Keav", slug: "mee-keav-abc123", ownerId: "owner1" };

describe.skipIf(!ENDPOINT)("photos in a real MinIO (PHOTOS-S3)", () => {
    const config = storageConfig({
        S3_ENDPOINT: ENDPOINT,
        S3_ACCESS_KEY: process.env.S3_TEST_ACCESS_KEY ?? "vmenu-local",
        S3_SECRET_KEY: process.env.S3_TEST_SECRET_KEY ?? "vmenu-local-only",
        S3_BUCKET: `vmenu-test-${randomBytes(4).toString("hex")}`, // a fresh bucket each run
    });
    const photos = minioPhotoStore(config);
    const url = new URL(config.endpoint);
    const admin = new S3Client({
        endpoint: url.origin,
        region: config.region,
        forcePathStyle: true,
        credentials: { accessKeyId: config.accessKey, secretAccessKey: config.secretKey },
    });
    const Bucket = config.bucket;
    const stat = (Key: string) => admin.send(new HeadObjectCommand({ Bucket, Key }));
    const app = createApp({ lookupRestaurant: fakeRestaurantLookup([R]), photos });
    let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
    let owner: Record<string, string>;
    let jpeg: Buffer;

    beforeAll(async () => {
        mongo = await startMemoryMongo("menu-minio");
        owner = await tokenFor("owner", { ownerId: "owner1" });
        jpeg = await sharp({ create: { width: 1200, height: 900, channels: 3, background: "#c33" } })
            .jpeg()
            .toBuffer();
        await photos.setup();
    });
    afterAll(async () => {
        await mongoose.connection.db?.dropDatabase();
        await mongo?.stop();
        const { Contents = [] } = await admin.send(new ListObjectsV2Command({ Bucket }));
        for (const o of Contents) await admin.send(new DeleteObjectCommand({ Bucket, Key: o.Key! }));
        await admin.send(new DeleteBucketCommand({ Bucket })).catch(() => {});
    });

    /** What the browser does: the form's fields, then the file, posted to the form's address. */
    async function browserPost(form: { url: string; fields: Record<string, string> }, file: Buffer, type: string) {
        const body = new FormData();
        for (const [k, v] of Object.entries(form.fields)) body.append(k, v);
        body.append("file", new Blob([new Uint8Array(file)], { type }), "dish");
        return fetch(form.url, { method: "POST", body });
    }
    const sign = (contentType: string) => request(app).post(`/api/menu/${R.slug}/images/uploads`).set(owner).send({ contentType });

    it("makes the bucket and a rule that expires incoming/ after a day; is up", async () => {
        await admin.send(new HeadBucketCommand({ Bucket }));
        const { Rules = [] } = await admin.send(new GetBucketLifecycleConfigurationCommand({ Bucket }));
        expect(Rules).toContainEqual(
            expect.objectContaining({
                Status: "Enabled",
                Filter: { Prefix: "incoming/" },
                Expiration: expect.objectContaining({ Days: 1 }),
            }),
        );
        await photos.setup(); // a second start changes nothing
        expect(await photos.isUp()).toBe(true);
    });

    it("sign, post to MinIO, confirm: the photo is kept as WebP with a year's cache, and its link serves it", async () => {
        const form = await sign("image/jpeg");
        expect(form.status).toBe(201);
        const posted = await browserPost(form.body, jpeg, "image/jpeg");
        expect(posted.status).toBe(204);

        const done = await request(app).post(`/api/menu/${R.slug}/images`).set(owner).send({ key: form.body.key });
        expect(done.status).toBe(201);
        const id = done.body.url.split("/").pop();
        const key = `photos/${R._id}/${id}.webp`;
        const kept = await stat(key);
        expect(kept.ContentType).toBe("image/webp");
        expect(kept.CacheControl).toBe("public, max-age=31536000, immutable");
        await expect(stat(form.body.key)).rejects.toThrow(); // incoming is gone

        const redirect = await request(app).get(done.body.url);
        expect(redirect.status).toBe(302);
        const image = await fetch(redirect.headers.location!);
        expect(image.status).toBe(200);
        expect(image.headers.get("content-type")).toBe("image/webp");
        expect(image.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
        expect((await sharp(Buffer.from(await image.arrayBuffer())).metadata()).width).toBe(800);

        // deleting the dish deletes the photo
        const item = await request(app)
            .post(`/api/menu/${R.slug}/items`)
            .set(owner)
            .send({ name: "Amok", priceCents: 500, image: done.body.url });
        await request(app).delete(`/api/menu/${R.slug}/items/${item.body._id}`).set(owner);
        await expect(stat(key)).rejects.toThrow();
    });

    it("MinIO itself refuses a file over 5 MB, another type, and another key", async () => {
        const form = (await sign("image/jpeg")).body;
        const big = await browserPost(form, Buffer.alloc(5 * 1024 * 1024 + 1, 1), "image/jpeg");
        expect(big.status).toBe(400);
        expect(await big.text()).toContain("EntityTooLarge");

        const png = await browserPost({ ...form, fields: { ...form.fields, "Content-Type": "image/png" } }, jpeg, "image/png");
        expect(png.status).toBe(403);
        const elsewhere = await browserPost(
            { ...form, fields: { ...form.fields, key: `photos/${R._id}/${"a".repeat(24)}.webp` } },
            jpeg,
            "image/jpeg",
        );
        expect(elsewhere.status).toBe(403);
        await expect(stat(form.key)).rejects.toThrow(); // nothing was stored
    });

    it("an expired form is refused by MinIO", async () => {
        const store = minioPhotoStore(config);
        const form = await store.signUpload(`incoming/${R._id}/${"e".repeat(32)}`, "image/jpeg", 5 * 1024 * 1024, -60);
        const res = await browserPost(form, jpeg, "image/jpeg");
        expect(res.status).toBe(403);
        expect(await res.text()).toMatch(/expired/i);
    });
});
