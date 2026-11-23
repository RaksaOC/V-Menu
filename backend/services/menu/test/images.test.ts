import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import sharp from "sharp";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { signAppToken, notFound } from "@vmenu/common";

// VM-02 (menu photos are uploaded, not sent as base64) and SEC-05 (the upload is safe).
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";

const RESTAURANTS = {
    "mee-keav-abc123": { _id: "665f00000000000000000001", name: "Mee Keav", slug: "mee-keav-abc123", ownerId: "owner1" },
    "other-xyz789": { _id: "665f00000000000000000002", name: "Other", slug: "other-xyz789", ownerId: "owner2" },
};
const lookupRestaurant = async (_req: unknown, slug: string) => {
    const r = RESTAURANTS[slug as keyof typeof RESTAURANTS];
    if (!r) throw notFound("Restaurant not found");
    return r;
};
const app = createApp({ lookupRestaurant });
const SLUG = "mee-keav-abc123";
const RES_ID = RESTAURANTS[SLUG]._id;

let mongo: MongoMemoryServer;
let owner: Record<string, string>, cashier: Record<string, string>, otherOwner: Record<string, string>;
let photo: Buffer, gpsPhoto: Buffer;
beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri("menu"));
    owner = { authorization: `Bearer ${await signAppToken({ uid: "owner1", email: "o@x.com", role: "owner" })}` };
    cashier = { authorization: `Bearer ${await signAppToken({ uid: "c1", email: "c@x.com", role: "cashier", resId: RES_ID, resSlug: SLUG })}` };
    otherOwner = { authorization: `Bearer ${await signAppToken({ uid: "owner2", email: "p@x.com", role: "owner" })}` };
    // A 1600 x 1200 photo, like a phone's, and the same with a GPS location in its EXIF.
    const noise = Buffer.alloc(1600 * 1200 * 3);
    for (let i = 0, s = 7; i < noise.length; i++) noise[i] = (s = (s * 1103515245 + 12345) & 0x7fffffff) & 255;
    photo = await sharp(noise, { raw: { width: 1600, height: 1200, channels: 3 } }).jpeg({ quality: 70 }).toBuffer();
    gpsPhoto = await sharp(photo)
        .withExif({ IFD0: { Make: "PhoneCo" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "11/1 33/1 25/1", GPSLongitudeRef: "E", GPSLongitude: "104/1 55/1 0/1" } })
        .jpeg()
        .toBuffer();
});
afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});
beforeEach(async () => {
    await mongoose.connection.db!.dropDatabase();
});

const upload = (file: Buffer, name = "dish.jpg", headers = owner, slug = SLUG, a = app) =>
    request(a).post(`/api/menu/${slug}/images`).set(headers).attach("image", file, { filename: name, contentType: "image/jpeg" });

describe("photo upload (VM-02)", () => {
    it("stores a real photo and returns a short URL that serves it", async () => {
        expect(photo.length).toBeGreaterThan(500_000); // far over the old 2,000-character limit as base64
        const res = await upload(photo);
        expect(res.status).toBe(201);
        expect(res.body.url).toMatch(new RegExp(`^/api/menu/${SLUG}/images/[a-f0-9]{24}$`));

        const img = await request(app).get(res.body.url).buffer(true).parse((r, cb) => {
            const chunks: Buffer[] = [];
            r.on("data", (c: Buffer) => chunks.push(c));
            r.on("end", () => cb(null, Buffer.concat(chunks)));
        });
        expect(img.status).toBe(200);
        expect(img.headers["content-type"]).toBe("image/webp");
        expect(img.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
        expect(img.headers["x-content-type-options"]).toBe("nosniff");
        const meta = await sharp(img.body as Buffer).metadata();
        expect(meta.format).toBe("webp");
        expect(meta.width).toBe(800); // resized to at most 800 px wide
        expect((img.body as Buffer).length).toBeLessThan(photo.length);
    });

    it("an item saved with the uploaded URL shows on the customer menu", async () => {
        const { body } = await upload(photo);
        const item = await request(app).post(`/api/menu/${SLUG}/items`).set(owner).send({ name: "Amok", price: 5, image: body.url });
        expect(item.status).toBe(201);
        const menu = await request(app).get(`/api/menu/${SLUG}/public/items`);
        expect(menu.body[0].image).toBe(body.url);
    });

    it("refuses a file over 5 MB with 413", async () => {
        const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(6 * 1024 * 1024)]);
        const res = await upload(big);
        expect(res.status).toBe(413);
        expect(res.body.message).toMatch(/5 MB/);
    });

    it("refuses a PDF with 415", async () => {
        const res = await upload(Buffer.from("%PDF-1.7\n1 0 obj << >> endobj\n"), "menu.pdf");
        expect(res.status).toBe(415);
    });

    it("refuses a request with no file", async () => {
        const res = await request(app).post(`/api/menu/${SLUG}/images`).set(owner).field("x", "y");
        expect(res.status).toBe(400);
    });

    it("only the restaurant's owner may upload", async () => {
        expect((await upload(photo, "dish.jpg", {})).status).toBe(401);
        expect((await upload(photo, "dish.jpg", cashier)).status).toBe(403);
        expect((await upload(photo, "dish.jpg", otherOwner)).status).toBe(403);
    });

    it("an image is only served under its own restaurant", async () => {
        const { body } = await upload(photo);
        const id = body.url.split("/").pop();
        expect((await request(app).get(`/api/menu/other-xyz789/images/${id}`)).status).toBe(404);
        expect((await request(app).get(`/api/menu/${SLUG}/images/not-an-id`)).status).toBe(400);
    });
});

describe("photo upload safety (SEC-05)", () => {
    it("checks the real file type: an SVG or HTML file named .jpg is refused", async () => {
        const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
        const html = Buffer.from("<!doctype html><script>alert(1)</script>");
        expect((await upload(svg, "dish.jpg")).status).toBe(415);
        expect((await upload(html, "dish.jpg")).status).toBe(415);
    });

    it("re-encodes the photo, so the GPS location and other EXIF data are gone", async () => {
        expect((await sharp(gpsPhoto).metadata()).exif).toBeDefined();
        const { body } = await upload(gpsPhoto);
        const img = await request(app).get(body.url).buffer(true).parse((r, cb) => {
            const chunks: Buffer[] = [];
            r.on("data", (c: Buffer) => chunks.push(c));
            r.on("end", () => cb(null, Buffer.concat(chunks)));
        });
        const meta = await sharp(img.body as Buffer).metadata();
        expect(meta.exif).toBeUndefined();
        expect((img.body as Buffer).includes(Buffer.from("PhoneCo"))).toBe(false);
    });

    it("refuses a file that claims to be a JPEG but isn't one", async () => {
        const fake = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("not really an image")]);
        expect((await upload(fake)).status).toBe(415);
    });

    it("limits uploads per restaurant per hour", async () => {
        const limited = createApp({ lookupRestaurant, uploadsPerHour: 2 });
        const small = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#f00" } }).png().toBuffer();
        expect((await upload(small, "a.png", owner, SLUG, limited)).status).toBe(201);
        expect((await upload(small, "b.png", owner, SLUG, limited)).status).toBe(201);
        const third = await upload(small, "c.png", owner, SLUG, limited);
        expect(third.status).toBe(429);
        // another restaurant has its own allowance
        expect((await upload(small, "d.png", otherOwner, "other-xyz789", limited)).status).toBe(201);
    });

    it("an item's image must be one of this restaurant's uploaded photos", async () => {
        const add = (image: string) => request(app).post(`/api/menu/${SLUG}/items`).set(owner).send({ name: "Amok", price: 5, image });
        expect((await add("https://tracker.example/pixel.jpg")).status).toBe(400);
        expect((await add("data:image/jpeg;base64,/9j/4AAQ")).status).toBe(400);
        expect((await add(`/api/menu/other-xyz789/images/${"a".repeat(24)}`)).status).toBe(400);
        expect((await add(`/api/menu/${SLUG}/images/${"a".repeat(24)}`)).status).toBe(201);
    });

    it("an existing item keeps its old image when other fields are edited", async () => {
        // items made before this change may still point elsewhere; editing the name must not fail
        const { Item } = await import("../src/models.js");
        const old = await Item.create({ name: "Old", price: 1, image: "https://images.example/old.jpg", resId: RES_ID });
        const res = await request(app).put(`/api/menu/${SLUG}/items/${old._id}`).set(owner).send({ name: "Renamed", price: 1, image: "https://images.example/old.jpg" });
        expect(res.status).toBe(200);
        expect(res.body.name).toBe("Renamed");
        const swap = await request(app).put(`/api/menu/${SLUG}/items/${old._id}`).set(owner).send({ image: "https://tracker.example/new.jpg" });
        expect(swap.status).toBe(400);
    });
});
