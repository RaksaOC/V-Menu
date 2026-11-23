import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prepareDatabase } from "../../src/db.js";
import { mongoBillsRepo } from "../../src/repositories/bills.repo.js";

// CL-06: bills stored as isPayed become isPaid, on a database seeded the way production is today:
// the old field, and VM-08's and VM-11's indexes built on it.
const RES = "665f00000000000000000001";
let mongo: MongoMemoryServer;
const bills = () => mongoose.connection.db!.collection("table_orders");

beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri("orders"), { autoIndex: false }); // as index.ts does
});
afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});
beforeEach(async () => {
    await mongoose.connection.db!.dropDatabase();
});

async function seedLikeProduction() {
    const at = new Date("2026-11-20T10:00:00Z");
    await bills().insertMany([
        { table: "1", resId: RES, isPayed: false, orders: [], createdAt: at, updatedAt: at },
        { table: "2", resId: RES, isPayed: true, orders: [], createdAt: at, updatedAt: at },
        { table: "1", resId: RES, isPayed: true, orders: [], createdAt: at, updatedAt: at },
    ]);
    await bills().createIndex(
        { resId: 1, table: 1 },
        { unique: true, partialFilterExpression: { isPayed: false }, name: "one_open_bill_per_table" },
    );
    await bills().createIndex({ resId: 1, isPayed: 1, updatedAt: -1 });
}

describe("prepareDatabase: the isPayed → isPaid migration (CL-06)", () => {
    it("renames the field on every bill and rebuilds the indexes on the new name", async () => {
        await seedLikeProduction();
        expect((await prepareDatabase()).bills).toEqual({
            renamed: 3,
            droppedIndexes: ["one_open_bill_per_table", "resId_1_isPayed_1_updatedAt_-1"],
        });

        expect(await bills().countDocuments({ isPayed: { $exists: true } })).toBe(0);
        expect(await bills().countDocuments({ isPaid: false })).toBe(1);
        expect(await bills().countDocuments({ isPaid: true })).toBe(2);

        const indexes = await bills().indexes();
        expect(indexes.find((i) => i.name === "one_open_bill_per_table")).toMatchObject({
            unique: true,
            partialFilterExpression: { isPaid: false },
        });
        expect(indexes.map((i) => i.name)).toContain("resId_1_isPaid_1_updatedAt_-1");
        expect(JSON.stringify(indexes)).not.toContain("isPayed");
    });

    it("the migrated open bill is still the table's open bill, and still the only one (VM-08)", async () => {
        await seedLikeProduction();
        await prepareDatabase();
        const open = await mongoBillsRepo.findOpen(RES, "1");
        expect(open?.isPaid).toBe(false);
        await expect(bills().insertOne({ table: "1", resId: RES, isPaid: false, orders: [] })).rejects.toMatchObject({ code: 11000 });
    });

    it("is safe to run again, and on a new, empty database", async () => {
        expect((await prepareDatabase()).bills).toEqual({ renamed: 0, droppedIndexes: [] });
        await mongoose.connection.db!.dropDatabase();
        await seedLikeProduction();
        await prepareDatabase();
        expect((await prepareDatabase()).bills).toEqual({ renamed: 0, droppedIndexes: [] });
    });
});

describe("prepareDatabase: isDone → status (VM-27)", () => {
    const orders = () => mongoose.connection.db!.collection("orders");
    const at = new Date("2026-11-20T10:00:00Z");
    async function seedOrders() {
        await orders().insertMany([
            { table: "1", resId: RES, isDone: true, orderedItems: [], orderedAt: at, createdAt: at, updatedAt: at },
            { table: "2", resId: RES, isDone: false, orderedItems: [], orderedAt: at, createdAt: at, updatedAt: at },
        ]);
        await orders().createIndex({ resId: 1, isDone: 1, createdAt: 1 }); // VM-10's queue index
    }

    it("done orders are served, the rest pending, each with one history entry; the queue index is rebuilt", async () => {
        await seedOrders();
        expect((await prepareDatabase()).orders).toEqual({ migrated: 2, droppedIndexes: ["resId_1_isDone_1_createdAt_1"] });
        expect(await orders().countDocuments({ isDone: { $exists: true } })).toBe(0);
        const byTable = Object.fromEntries((await orders().find().toArray()).map((o) => [o.table, o]));
        expect(byTable["1"]).toMatchObject({ status: "served", statusHistory: [{ status: "served", at, by: "migration" }] });
        expect(byTable["2"]).toMatchObject({ status: "pending", statusHistory: [{ status: "pending", at, by: "migration" }] });
        const names = (await orders().indexes()).map((i) => i.name);
        expect(names).toContain("resId_1_status_1_createdAt_1");
        expect(names.join()).not.toContain("isDone");
    });

    it("is safe to run again", async () => {
        await seedOrders();
        await prepareDatabase();
        expect((await prepareDatabase()).orders).toEqual({ migrated: 0, droppedIndexes: [] });
    });
});
