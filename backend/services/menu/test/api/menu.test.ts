import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { fakeRestaurantLookup, startMemoryMongo, tokenFor } from "@vmenu/common/testing";
import { createApp } from "../../src/app.js";
import { NO_OPEN_BILLS } from "../unit/fakes.js";

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";

// Stand-in for restaurant-service: two restaurants with different owners.
const RESTAURANTS = {
    "mee-keav-abc123": { _id: "665f00000000000000000001", name: "Mee Keav", slug: "mee-keav-abc123", ownerId: "owner1" },
    "other-xyz789": { _id: "665f00000000000000000002", name: "Other", slug: "other-xyz789", ownerId: "owner2" },
};
const app = createApp({
    openBills: () => NO_OPEN_BILLS, // VM-15: order-service, mocked
    lookupRestaurant: fakeRestaurantLookup(RESTAURANTS),
});
const SLUG = "mee-keav-abc123";
const RES_ID = RESTAURANTS[SLUG]._id;
// SEC-05: an item's image must be one of the restaurant's uploaded photos.
const PHOTO = `/api/menu/${SLUG}/images/${"a".repeat(24)}`;

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
let owner: Record<string, string>, cashier: Record<string, string>, otherOwner: Record<string, string>;
beforeAll(async () => {
    mongo = await startMemoryMongo("menu");
    owner = await tokenFor("owner", { ownerId: "owner1" });
    cashier = await tokenFor("cashier", { _id: RES_ID, slug: SLUG }, { uid: "c1" });
    otherOwner = await tokenFor("owner", { ownerId: "owner2" });
});
afterAll(async () => {
    await mongo.stop();
});
beforeEach(async () => {
    await mongoose.connection.db!.dropDatabase();
});

const addItem = (body: object) => request(app).post(`/api/menu/${SLUG}/items`).set(owner).send(body);

describe("menu items", () => {
    it("owner adds an item; customers see a switched-off one as sold out, after the others (VM-26)", async () => {
        const hidden = await addItem({ name: "Lok Lak", priceCents: 400, image: PHOTO, isEnabled: false });
        expect(hidden.status).toBe(201);
        await addItem({ name: "Kuy Teav", priceCents: 250, image: PHOTO });
        const pub = await request(app).get(`/api/menu/${SLUG}/public/items`);
        // VM-25: grouped by category; with none set, everything is under Other
        expect(pub.body).toMatchObject({
            categories: [
                {
                    _id: null,
                    name: "Other",
                    items: [
                        { name: "Kuy Teav", isEnabled: true },
                        { name: "Lok Lak", isEnabled: false },
                    ],
                },
            ],
        });
    });

    it("a description and tags are saved, shown to customers, and can be cleared (VM-26)", async () => {
        const { body: dish } = await addItem({
            name: "Amok",
            priceCents: 500,
            image: PHOTO,
            description: " Steamed fish curry ",
            tags: ["spicy", "contains nuts", "spicy"],
        });
        expect(dish).toMatchObject({ description: "Steamed fish curry", tags: ["spicy", "contains nuts"] });
        const pub = await request(app).get(`/api/menu/${SLUG}/public/items`);
        expect(pub.body.categories[0].items[0]).toMatchObject({ description: "Steamed fish curry", tags: ["spicy", "contains nuts"] });
        const cleared = await request(app).put(`/api/menu/${SLUG}/items/${dish._id}`).set(owner).send({ description: "", tags: [] });
        expect(cleared.body).toMatchObject({ description: "", tags: [] });
    });

    it("a sold-out dish is on the public menu but can't be ordered (VM-26)", async () => {
        const { body: dish } = await addItem({ name: "Amok", priceCents: 500, image: PHOTO, isEnabled: false });
        const { body: table } = await request(app).post(`/api/menu/${SLUG}/tables`).set(owner).send({ type: "manual", name: "C3" });
        await request(app).patch(`/api/menu/${SLUG}/tables/${table._id}/availability`).set(owner).send({ isEnabled: true });
        const res = await request(app)
            .post(`/internal/restaurants/${RES_ID}/order-check`)
            .set("x-internal-key", "internal-test-key")
            .send({ table: "C3", items: [{ _id: dish._id, quantity: 1 }] });
        expect(res.status).toBe(409);
        expect(res.body.code).toBe("ITEMS_UNAVAILABLE");
    });

    it("ignores a resId in the body", async () => {
        const res = await addItem({ name: "Nom Banh Chok", priceCents: 200, image: PHOTO, resId: "665f00000000000000000002" });
        expect(res.body.resId).toBe(RES_ID);
    });

    it("lets a cashier switch an item off, but not delete it", async () => {
        const { body: item } = await addItem({ name: "Amok", priceCents: 500, image: PHOTO });
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
        const { body: item } = await addItem({ name: "Bai Sach Chrouk", priceCents: 300, image: PHOTO });
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
        expect(ok.body.items[0]).toMatchObject({ item: { name: "Bai Sach Chrouk", priceCents: 300 }, quantity: 2 });
    });

    it("names the dishes that are no longer available (VM-06)", async () => {
        const { body: item } = await addItem({ name: "Amok", priceCents: 500, image: PHOTO });
        const { body: gone } = await addItem({ name: "Prahok", priceCents: 400, image: PHOTO });
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

describe("input checks name the fields (CL-05, VM-17)", () => {
    it("a bad new dish is a 400 with the fields to fix", async () => {
        const res = await addItem({ name: "", priceCents: "abc" });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe("INVALID_INPUT");
        expect(Object.keys(res.body.fields).sort()).toEqual(["image", "name", "priceCents"]);
    });

    it("a page opened before CL-07 can still send `price` in dollars; the answer has both", async () => {
        const res = await addItem({ name: "Old page", price: 2.35, image: PHOTO });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ priceCents: 235, price: 2.35 });
    });

    // VM-17: an edit with a bad value used to answer 200 and change nothing (or, for an empty
    // price, set it to 0). Now each bad field is a 400 that names it, and the dish is unchanged.
    it.each([
        [{ priceCents: -5 }, "priceCents", "Can't be negative"],
        [{ priceCents: "" }, "priceCents", "Must be a number"],
        [{ priceCents: null }, "priceCents", "Must be a number"],
        [{ priceCents: 2.5 }, "priceCents", "Must be a whole number of cents"],
        [{ price: -5 }, "price", "Must be 0 or more"], // CL-07: the old dollar field, from a page opened before the deploy
        [{ price: "" }, "price", "Required"],
        [{ price: null }, "price", "Must be a number"],
        [{ price: "abc" }, "price", "Must be a number"],
        [{ price: 2.555 }, "price", "At most 2 decimal places"],
        [{ name: "" }, "name", "Required"],
        [{ name: "   " }, "name", "Required"],
        [{ name: "x".repeat(121) }, "name", "At most 120 characters"],
        [{ image: "" }, "image", "Required"],
        [{ isEnabled: "yes" }, "isEnabled", "Must be true or false"],
        [{ categoryId: "nope" }, "categoryId", "Must be a 24-character id"],
        [{ description: "x".repeat(301) }, "description", "At most 300 characters"], // VM-26
        [{ tags: ["tasty"] }, "tags.0", "Not one of the dish tags"], // VM-26
    ])("editing a dish with %j is a 400 naming %s, and changes nothing", async (body, field, message) => {
        const { body: dish } = await addItem({ name: "Amok", priceCents: 500, image: PHOTO });
        const res = await request(app).put(`/api/menu/${SLUG}/items/${dish._id}`).set(owner).send(body);
        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({ code: "INVALID_INPUT", fields: { [field]: message } });
        expect(Object.keys(res.body.fields)).toEqual([field]);
        const [after] = (await request(app).get(`/api/menu/${SLUG}/items`).set(owner)).body;
        expect(after).toMatchObject({ name: "Amok", priceCents: 500, image: PHOTO, isEnabled: true });
    });

    it("a manual table needs its name", async () => {
        const res = await request(app).post(`/api/menu/${SLUG}/tables`).set(owner).send({ type: "manual", name: " " });
        expect(res.status).toBe(400);
        expect(res.body.fields).toEqual({ name: "Required" });
    });
});

describe("contract: menu-service's real order-check answer (CL-05)", () => {
    it("matches OrderCheckResponse, the schema order-service reads it with", async () => {
        const { OrderCheckResponse } = await import("@vmenu/contracts");
        const { body: dish } = await addItem({ name: "Kuy Teav", priceCents: 250, image: PHOTO });
        const table = (await request(app).post(`/api/menu/${SLUG}/tables`).set(owner).send({})).body;
        await request(app).patch(`/api/menu/${SLUG}/tables/${table._id}/availability`).set(owner).send({ isEnabled: true });
        const res = await request(app)
            .post(`/internal/restaurants/${RES_ID}/order-check`)
            .set("x-internal-key", "internal-test-key")
            .send({ table: table.name, items: [{ _id: dish._id, quantity: 2 }] });
        expect(res.status).toBe(200);
        expect(OrderCheckResponse.parse(res.body)).toEqual(res.body);
    });
});

describe("menu categories over HTTP (VM-25)", () => {
    const categories = () => request(app).get(`/api/menu/${SLUG}/categories`).set(cashier);
    const add = (name: string) => request(app).post(`/api/menu/${SLUG}/categories`).set(owner).send({ name });

    it("the owner creates, renames, reorders and deletes; the cashier can read them", async () => {
        const { body: mains, status } = await add("Mains");
        expect(status).toBe(201);
        const { body: drinks } = await add("Drinks");
        expect((await categories()).body.map((c: { name: string }) => c.name)).toEqual(["Mains", "Drinks"]);

        const renamed = await request(app).put(`/api/menu/${SLUG}/categories/${drinks._id}`).set(owner).send({ name: "Cold drinks" });
        expect(renamed.body.name).toBe("Cold drinks");
        const order = await request(app)
            .put(`/api/menu/${SLUG}/categories/order`)
            .set(owner)
            .send({ ids: [drinks._id, mains._id] });
        expect(order.body.map((c: { name: string }) => c.name)).toEqual(["Cold drinks", "Mains"]);

        expect((await request(app).post(`/api/menu/${SLUG}/categories`).set(cashier).send({ name: "Nope" })).status).toBe(403);
        expect((await request(app).delete(`/api/menu/${SLUG}/categories/${mains._id}`).set(owner)).status).toBe(200);
        expect((await categories()).body.map((c: { name: string }) => c.name)).toEqual(["Cold drinks"]);
    });

    it("the public menu groups dishes, and a deleted category's dishes move to Other", async () => {
        const { body: drinks } = await add("Drinks");
        await addItem({ name: "Iced Coffee", priceCents: 150, image: PHOTO, categoryId: drinks._id });
        await addItem({ name: "Bread", priceCents: 100, image: PHOTO });
        const grouped = await request(app).get(`/api/menu/${SLUG}/public/items`);
        expect(
            grouped.body.categories.map((c: { name: string; items: { name: string }[] }) => [c.name, c.items.map((i) => i.name)]),
        ).toEqual([
            ["Drinks", ["Iced Coffee"]],
            ["Other", ["Bread"]],
        ]);
        await request(app).delete(`/api/menu/${SLUG}/categories/${drinks._id}`).set(owner);
        const after = await request(app).get(`/api/menu/${SLUG}/public/items`);
        expect(after.body.categories).toMatchObject([{ name: "Other", items: [{ name: "Bread" }, { name: "Iced Coffee" }] }]);
    });

    it("a bad name, or a dish in an unknown category, is a 400 naming the field", async () => {
        expect((await add("")).body.fields).toEqual({ name: "Required" });
        const res = await addItem({ name: "Tea", priceCents: 100, image: PHOTO, categoryId: "665f0000000000000000ffff" });
        expect(res.status).toBe(400);
        expect(res.body.fields).toEqual({ categoryId: "Unknown category" });
    });
});
