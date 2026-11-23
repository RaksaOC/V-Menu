import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { HttpError, notFound, signAppToken } from "@vmenu/common";

// VM-04: the customer's table check says *why* a table can't be used, so the page can say so.
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";

const SLUG = "mee-keav-abc123";
const RES = { _id: "665f00000000000000000001", name: "Mee Keav", slug: SLUG, ownerId: "owner1" };
let restaurantServiceDown = false;
const app = createApp({
    lookupRestaurant: async (_req, slug) => {
        if (restaurantServiceDown) throw new HttpError(503, "A required service is unavailable");
        if (slug !== SLUG) throw notFound("Restaurant not found");
        return RES;
    },
});

let mongo: MongoMemoryServer;
let owner: Record<string, string>;
beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri("menu"));
    owner = { authorization: `Bearer ${await signAppToken({ uid: "owner1", email: "o@x.com", role: "owner" })}` };
});
afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});
beforeEach(async () => {
    restaurantServiceDown = false;
    await mongoose.connection.db!.dropDatabase();
});

const check = (table: string, slug = SLUG) => request(app).get(`/api/menu/${slug}/public/tables/${encodeURIComponent(table)}`);

describe("public table check (VM-04)", () => {
    it("new tables start closed, and say so until the cashier opens them", async () => {
        const { body } = await request(app).post(`/api/menu/${SLUG}/tables`).set(owner).send({ type: "manual", name: "Patio 4" });
        expect(body.isEnabled).toBe(false);
        expect((await check("Patio 4")).body.code).toBe("TABLE_CLOSED");
        await request(app).patch(`/api/menu/${SLUG}/tables/${body._id}/availability`).set(owner).send({ isEnabled: true });
        expect((await check("Patio 4")).status).toBe(200);
    });

    it("a closed table answers TABLE_CLOSED with the table's name", async () => {
        await request(app).post(`/api/menu/${SLUG}/tables`).set(owner).send({ type: "manual", name: "4" });
        const res = await check("4");
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ code: "TABLE_CLOSED", message: "Table 4 isn't open yet. Please ask a staff member to open it." });
    });

    it("a table that doesn't exist answers TABLE_NOT_FOUND", async () => {
        const res = await check("Nope");
        expect(res.status).toBe(404);
        expect(res.body.code).toBe("TABLE_NOT_FOUND");
    });

    it("an unknown restaurant answers RESTAURANT_NOT_FOUND, for the table and the menu", async () => {
        for (const url of [`/api/menu/no-such-place/public/tables/1`, `/api/menu/no-such-place/public/items`]) {
            const res = await request(app).get(url);
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ code: "RESTAURANT_NOT_FOUND", message: "We couldn't find this restaurant." });
        }
    });

    it("a server problem stays a server error (not a 404), so the page can offer Try again", async () => {
        restaurantServiceDown = true;
        const res = await check("1");
        expect(res.status).toBe(503);
        expect(res.body.code).toBeUndefined();
    });
});
