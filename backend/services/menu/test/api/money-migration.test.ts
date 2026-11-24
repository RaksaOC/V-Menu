import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prepareDatabase } from "../../src/db.js";
import { mongoItemsRepo } from "../../src/repositories/items.repo.js";

// CL-07: dishes get priceCents next to their old price. The old price stays and is kept in step,
// so the previous version still works if a deploy is rolled back.
const RES = "665f00000000000000000001";
const items = () => mongoose.connection.db!.collection("items");
const old = (name: string, price: number, more: object = {}) => ({ name, price, image: "/a.jpg", isEnabled: true, resId: RES, ...more });

let mongo: MongoMemoryServer;
beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri("menu"));
});
afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});
beforeEach(async () => {
    await mongoose.connection.db!.dropDatabase();
});

describe("dish prices to cents (CL-07)", () => {
    it("adds priceCents and keeps the old price", async () => {
        await items().insertMany([old("A", 2.35), old("B", 0.1), old("C", 5)]);
        expect((await prepareDatabase()).prices).toEqual({ migrated: 3, rounded: 0 });
        const saved = await items().find().sort({ name: 1 }).toArray();
        expect(saved.map((i) => [i.price, i.priceCents])).toEqual([
            [2.35, 235],
            [0.1, 10],
            [5, 500],
        ]);
    });

    it("is safe to run twice", async () => {
        await items().insertOne(old("A", 2.5));
        expect((await prepareDatabase()).prices.migrated).toBe(1);
        expect((await prepareDatabase()).prices).toEqual({ migrated: 0, rounded: 0 });
    });

    it("counts prices that weren't whole cents", async () => {
        await items().insertOne(old("A", 1.005));
        expect((await prepareDatabase()).prices).toEqual({ migrated: 1, rounded: 1 });
        expect((await items().findOne())!.priceCents).toBe(101);
    });

    it("picks up a price the previous version changed after a rollback", async () => {
        await items().insertOne(old("A", 2.5, { priceCents: 250 }));
        await items().updateOne({}, { $set: { price: 3.75 } }); // the old code only knows `price`
        expect((await prepareDatabase()).prices.migrated).toBe(1);
        expect((await items().findOne())!.priceCents).toBe(375);
    });

    it("the repository keeps the old price in step with the cents", async () => {
        const created = await mongoItemsRepo.create(RES, { name: "A", priceCents: 235, image: "/a.jpg" });
        expect((await items().findOne({ name: "A" }))!.price).toBe(2.35);
        await mongoItemsRepo.update(RES, String(created._id), { priceCents: 410 });
        const saved = await items().findOne({ name: "A" });
        expect([saved!.price, saved!.priceCents]).toEqual([4.1, 410]);
    });

    it("the repository leaves the old price alone when the price doesn't change", async () => {
        const created = await mongoItemsRepo.create(RES, { name: "A", priceCents: 235, image: "/a.jpg" });
        await mongoItemsRepo.update(RES, String(created._id), { isEnabled: false });
        expect((await items().findOne({ name: "A" }))!.price).toBe(2.35);
    });
});
