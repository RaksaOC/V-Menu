import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { signAppToken, notFound } from "@vmenu/common";

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";

// Stand-in for restaurant-service: two restaurants with different owners.
const RESTAURANTS = {
    "mee-keav-abc123": { _id: "665f00000000000000000001", name: "Mee Keav", slug: "mee-keav-abc123", ownerId: "owner1" },
    "other-xyz789": { _id: "665f00000000000000000002", name: "Other", slug: "other-xyz789", ownerId: "owner2" },
};
const app = createApp({
    lookupRestaurant: async (_req, slug) => {
        const r = RESTAURANTS[slug as keyof typeof RESTAURANTS];
        if (!r) throw notFound("Restaurant not found");
        return r;
    },
});
const SLUG = "mee-keav-abc123";
const RES_ID = RESTAURANTS[SLUG]._id;
// SEC-05: an item's image must be one of the restaurant's uploaded photos.
const PHOTO = `/api/menu/${SLUG}/images/${"a".repeat(24)}`;

let mongo: MongoMemoryServer;
let owner: Record<string, string>, cashier: Record<string, string>, otherOwner: Record<string, string>;
beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri("menu"));
    owner = { authorization: `Bearer ${await signAppToken({ uid: "owner1", email: "o@x.com", role: "owner" })}` };
    cashier = {
        authorization: `Bearer ${await signAppToken({ uid: "c1", email: "c@x.com", role: "cashier", resId: RES_ID, resSlug: SLUG })}`,
    };
    otherOwner = { authorization: `Bearer ${await signAppToken({ uid: "owner2", email: "p@x.com", role: "owner" })}` };
});
afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});
beforeEach(async () => {
    await mongoose.connection.db!.dropDatabase();
});

const addItem = (body: object) => request(app).post(`/api/menu/${SLUG}/items`).set(owner).send(body);

describe("menu items", () => {
    it("owner adds an item; customers only see enabled ones", async () => {
        await addItem({ name: "Kuy Teav", price: 2.5, image: PHOTO });
        const hidden = await addItem({ name: "Lok Lak", price: 4, image: PHOTO, isEnabled: false });
        expect(hidden.status).toBe(201);
        const pub = await request(app).get(`/api/menu/${SLUG}/public/items`);
        expect(pub.body.map((i: { name: string }) => i.name)).toEqual(["Kuy Teav"]);
    });

    it("ignores a resId in the body", async () => {
        const res = await addItem({ name: "Nom Banh Chok", price: 2, image: PHOTO, resId: "665f00000000000000000002" });
        expect(res.body.resId).toBe(RES_ID);
    });

    it("lets a cashier switch an item off, but not delete it", async () => {
        const { body: item } = await addItem({ name: "Amok", price: 5, image: PHOTO });
        const off = await request(app).patch(`/api/menu/${SLUG}/items/${item._id}/availability`).set(cashier).send({ isEnabled: false });
        expect(off.body.isEnabled).toBe(false);
        expect((await request(app).delete(`/api/menu/${SLUG}/items/${item._id}`).set(cashier)).status).toBe(403);
    });

    it("blocks another owner from this restaurant", async () => {
        const res = await request(app).get(`/api/menu/${SLUG}/items`).set(otherOwner);
        expect(res.status).toBe(403);
    });
});

describe("tables", () => {
    it("numbers tables automatically and checks availability", async () => {
        const t1 = await request(app).post(`/api/menu/${SLUG}/tables`).set(owner).send({ type: "auto" });
        const t2 = await request(app).post(`/api/menu/${SLUG}/tables`).set(owner).send({ type: "auto" });
        expect([t1.body.name, t2.body.name]).toEqual(["1", "2"]);
        expect((await request(app).get(`/api/menu/${SLUG}/public/tables/1`)).status).toBe(404); // new tables start closed
        await request(app).patch(`/api/menu/${SLUG}/tables/${t1.body._id}/availability`).set(cashier).send({ isEnabled: true });
        expect((await request(app).get(`/api/menu/${SLUG}/public/tables/1`)).status).toBe(200);
    });
});

describe("order check (internal)", () => {
    it("returns server prices and rejects closed tables", async () => {
        const { body: item } = await addItem({ name: "Bai Sach Chrouk", price: 3, image: PHOTO });
        const { body: table } = await request(app).post(`/api/menu/${SLUG}/tables`).set(owner).send({ type: "manual", name: "A1" });
        const check = (t: string) =>
            request(app)
                .post(`/internal/restaurants/${RES_ID}/order-check`)
                .set("x-internal-key", "internal-test-key")
                .send({ table: t, items: [{ _id: item._id, quantity: 2 }] });
        const closed = await check("A1");
        expect(closed.status).toBe(409); // new tables start closed
        expect(closed.body).toMatchObject({ code: "TABLE_CLOSED", message: "Table is not available" });
        await request(app).patch(`/api/menu/${SLUG}/tables/${table._id}/availability`).set(owner).send({ isEnabled: true });
        const ok = await check("A1");
        expect(ok.body.items[0]).toMatchObject({ item: { name: "Bai Sach Chrouk", price: 3 }, quantity: 2 });
    });

    it("names the dishes that are no longer available (VM-06)", async () => {
        const { body: item } = await addItem({ name: "Amok", price: 5, image: PHOTO });
        const { body: gone } = await addItem({ name: "Prahok", price: 4, image: PHOTO });
        const { body: table } = await request(app).post(`/api/menu/${SLUG}/tables`).set(owner).send({ type: "manual", name: "B2" });
        await request(app).patch(`/api/menu/${SLUG}/tables/${table._id}/availability`).set(owner).send({ isEnabled: true });
        await request(app).patch(`/api/menu/${SLUG}/items/${gone._id}/availability`).set(owner).send({ isEnabled: false });
        const res = await request(app)
            .post(`/internal/restaurants/${RES_ID}/order-check`)
            .set("x-internal-key", "internal-test-key")
            .send({
                table: "B2",
                items: [
                    { _id: item._id, quantity: 1 },
                    { _id: gone._id, quantity: 1 },
                ],
            });
        expect(res.status).toBe(409);
        expect(res.body).toMatchObject({ code: "ITEMS_UNAVAILABLE", message: "Some items are no longer available" });
    });
});
