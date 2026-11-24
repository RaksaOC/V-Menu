import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startMemoryMongo } from "@vmenu/common/testing";
import { prepareDatabase } from "../../src/db.js";

// CL-07: stored order lines get priceCents next to their old price. The old price stays, so the
// previous version still works if a deploy is rolled back.
const RES = "665f00000000000000000001";
const orders = () => mongoose.connection.db!.collection("orders");
const dish = (price?: number) => ({
    _id: "665f0000000000000000aaaa",
    name: "Kuy Teav",
    image: "k.jpg",
    isEnabled: true,
    ...(price !== undefined && { price }),
});
const old = (lines: object[]) => ({
    table: "1",
    resId: RES,
    status: "served",
    statusHistory: [],
    orderedItems: lines,
    createdAt: new Date(),
});

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
beforeAll(async () => {
    mongo = await startMemoryMongo("orders", { autoIndex: false });
});
afterAll(async () => {
    await mongo.stop();
});
beforeEach(async () => {
    await mongoose.connection.db!.dropDatabase();
});

describe("order lines to cents (CL-07)", () => {
    it("adds priceCents to every line and keeps the old price", async () => {
        const { insertedId } = await orders().insertOne(
            old([
                { item: dish(2.35), quantity: 3 },
                { item: dish(0.1), quantity: 1 },
            ]),
        );
        const { money } = await prepareDatabase();
        expect(money).toEqual({ migrated: 1, rounded: 0 });
        const saved = await orders().findOne({ _id: insertedId });
        expect(saved!.orderedItems.map((l: { item: { price: number; priceCents: number } }) => [l.item.price, l.item.priceCents])).toEqual([
            [2.35, 235],
            [0.1, 10],
        ]);
    });

    it("is safe to run twice", async () => {
        await orders().insertOne(old([{ item: dish(2.5), quantity: 1 }]));
        expect((await prepareDatabase()).money.migrated).toBe(1);
        expect((await prepareDatabase()).money).toEqual({ migrated: 0, rounded: 0 });
    });

    it("counts prices that weren't whole cents, and a line with no price is 0", async () => {
        const { insertedId } = await orders().insertOne(
            old([
                { item: dish(1.005), quantity: 1 },
                { item: dish(), quantity: 1 },
            ]),
        );
        expect((await prepareDatabase()).money).toEqual({ migrated: 1, rounded: 1 });
        const saved = await orders().findOne({ _id: insertedId });
        expect(saved!.orderedItems.map((l: { item: { priceCents: number } }) => l.item.priceCents)).toEqual([101, 0]);
    });

    it("leaves a line with no dish alone, and handles more orders than one batch", async () => {
        await orders().insertOne(old([{ quantity: 1 }]));
        await orders().insertMany(Array.from({ length: 1201 }, () => old([{ item: dish(1.5), quantity: 1 }])));
        expect((await prepareDatabase()).money.migrated).toBe(1201);
        expect(await orders().countDocuments({ "orderedItems.item.priceCents": 150 })).toBe(1201);
    });
});
