import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { notFound, signAppToken } from "@vmenu/common";
import { createApp } from "../../src/app.js";

// VM-15: over HTTP, with order-service mocked (as order-service's tests mock menu-service).
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";
const SLUG = "mee-keav-abc123";
const RES = { _id: "665f00000000000000000001", name: "Mee Keav", slug: SLUG, ownerId: "owner1" };
let unpaid: string[] = [];
const app = createApp({
    lookupRestaurant: async (_req, slug) => {
        if (slug !== SLUG) throw notFound("Restaurant not found");
        return RES;
    },
    openBills: () => ({ hasOpenBill: async (_resId, name) => unpaid.includes(name) }),
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
    unpaid = [];
    await mongoose.connection.db!.dropDatabase();
});

const add = async (name: string) =>
    (await request(app).post(`/api/menu/${SLUG}/tables`).set(owner).send({ type: "manual", name })).body as { _id: string };
const rename = (id: string, name: string) => request(app).put(`/api/menu/${SLUG}/tables/${id}`).set(owner).send({ name });
const remove = (id: string) => request(app).delete(`/api/menu/${SLUG}/tables/${id}`).set(owner);

describe("a table with an unpaid bill (VM-15)", () => {
    it("rename and delete answer 409 with the reason, and nothing changes", async () => {
        const t = await add("4");
        unpaid = ["4"];
        for (const res of [await rename(t._id, "Patio"), await remove(t._id)]) {
            expect(res.status).toBe(409);
            expect(res.body).toEqual({ code: "TABLE_HAS_OPEN_BILL", message: "Table 4 has an unpaid bill. Mark it paid, then try again." });
        }
        const tables = (await request(app).get(`/api/menu/${SLUG}/tables`).set(owner)).body;
        expect(tables.map((x: { name: string }) => x.name)).toEqual(["4"]);
    });

    it("once the bill is paid, rename and delete work", async () => {
        const t = await add("4");
        expect((await rename(t._id, "Patio")).status).toBe(200);
        expect((await remove(t._id)).status).toBe(200);
    });
});
