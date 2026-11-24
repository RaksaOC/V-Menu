import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@vmenu/common";
import { startMemoryMongo } from "@vmenu/common/testing";
import { prepareDatabase } from "../../src/db.js";
import { Bill } from "../../src/models/bill.model.js";
import { mongoBillsRepo } from "../../src/repositories/bills.repo.js";
import { mongoOrdersRepo } from "../../src/repositories/orders.repo.js";

// CL-06 and VM-27 (review follow-up): bills keep `isPayed` next to `isPaid`, and orders keep
// `isDone` next to `status`, for one release. The previous version reads only the old fields, so
// after a rollback it still sees which bills are paid and which orders the kitchen has done, and
// the next roll-forward picks up what it changed.
const RES = "665f00000000000000000001";
let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
const bills = () => mongoose.connection.db!.collection("table_orders");
const orders = () => mongoose.connection.db!.collection("orders");
const at = new Date("2026-11-20T10:00:00Z");

beforeAll(async () => {
    mongo = await startMemoryMongo("orders", { autoIndex: false }); // as index.ts does
});
afterAll(async () => {
    await mongo.stop();
});
beforeEach(async () => {
    await mongoose.connection.db!.dropDatabase();
    vi.restoreAllMocks();
});

describe("bills written by this version have both fields (CL-06)", () => {
    it("a new bill is open under both names; paying and re-opening change both", async () => {
        const id = await mongoBillsRepo.openBillFor(RES, "1");
        expect(await bills().findOne({ _id: new mongoose.Types.ObjectId(id) })).toMatchObject({ isPaid: false, isPayed: false });
        await mongoBillsRepo.setPaid(RES, id, true);
        expect(await bills().findOne({ _id: new mongoose.Types.ObjectId(id) })).toMatchObject({ isPaid: true, isPayed: true });
        await mongoBillsRepo.setPaid(RES, id, false);
        expect(await bills().findOne({ _id: new mongoose.Types.ObjectId(id) })).toMatchObject({ isPaid: false, isPayed: false });
    });
});

describe("orders written by this version have isDone as well as status (VM-27)", () => {
    it("isDone is true once the kitchen has finished the order (ready or served), as the old Done button meant", async () => {
        const order = await mongoOrdersRepo.create({ table: "1", resId: RES, billId: "665f0000000000000000b111", orderedItems: [] });
        const isDone = async () => (await orders().findOne({ _id: new mongoose.Types.ObjectId(String(order._id)) }))?.isDone;
        expect(await isDone()).toBe(false);
        const step = (from: string, to: string) =>
            mongoOrdersRepo.setStatus(RES, String(order._id), from as never, to as never, { at: new Date(), by: "u1" });
        await step("pending", "preparing");
        expect(await isDone()).toBe(false);
        await step("preparing", "ready");
        expect(await isDone()).toBe(true);
        await step("ready", "served");
        expect(await isDone()).toBe(true);
    });

    it("a cancelled order isn't done (the old version's sales left it out)", async () => {
        const order = await mongoOrdersRepo.create({ table: "1", resId: RES, billId: "665f0000000000000000b111", orderedItems: [] });
        await mongoOrdersRepo.setStatus(RES, String(order._id), "pending", "cancelled", { at: new Date(), by: "u1" });
        expect((await orders().findOne({ _id: new mongoose.Types.ObjectId(String(order._id)) }))?.isDone).toBe(false);
    });
});

describe("the migrations keep the old fields, and pick up what a rollback changed", () => {
    it("bills from before this fix (isPaid only) get isPayed back", async () => {
        await bills().insertMany([
            { table: "1", resId: RES, isPaid: false, orders: [], createdAt: at, updatedAt: at },
            { table: "2", resId: RES, isPaid: true, orders: [], createdAt: at, updatedAt: at },
        ]);
        expect((await prepareDatabase()).bills).toMatchObject({ renamed: 0, backfilled: 2 });
        expect(await bills().countDocuments({ isPaid: false, isPayed: false })).toBe(1);
        expect(await bills().countDocuments({ isPaid: true, isPayed: true })).toBe(1);
        expect((await prepareDatabase()).bills).toMatchObject({ renamed: 0, backfilled: 0 });
    });

    it("a bill the previous version marked paid during a rollback is paid after the roll-forward", async () => {
        await bills().insertOne({ table: "1", resId: RES, isPaid: false, isPayed: true, orders: [], createdAt: at, updatedAt: at });
        expect((await prepareDatabase()).bills).toMatchObject({ renamed: 1 });
        expect(await bills().findOne({ table: "1" })).toMatchObject({ isPaid: true, isPayed: true });
    });

    it("orders from before this fix (status only) get isDone back", async () => {
        await orders().insertMany(
            ["pending", "preparing", "ready", "served", "cancelled"].map((status) => ({
                table: status,
                resId: RES,
                status,
                statusHistory: [{ status, at, by: "u1" }],
                orderedItems: [],
                createdAt: at,
                updatedAt: at,
            })),
        );
        expect((await prepareDatabase()).orders).toMatchObject({ migrated: 0, backfilled: 5 });
        const done = Object.fromEntries((await orders().find().toArray()).map((o) => [o.status, o.isDone]));
        expect(done).toEqual({ pending: false, preparing: false, ready: true, served: true, cancelled: false });
        expect((await prepareDatabase()).orders).toMatchObject({ migrated: 0, backfilled: 0 });
    });

    it("an order the previous version marked done during a rollback is served after the roll-forward", async () => {
        await orders().insertOne({
            table: "1",
            resId: RES,
            status: "preparing",
            isDone: true,
            statusHistory: [{ status: "pending", at, by: "customer" }],
            orderedItems: [],
            createdAt: at,
            updatedAt: at,
        });
        expect((await prepareDatabase()).orders).toMatchObject({ migrated: 1 });
        const order = await orders().findOne({ table: "1" });
        expect(order).toMatchObject({ status: "served", isDone: true });
        expect(order?.statusHistory.at(-1)).toMatchObject({ status: "served", at, by: "migration" });
    });

    it("a table with two open bills doesn't stop startup: both stay open for staff, and it's logged", async () => {
        // This version's index exists; a bill from before this fix (isPaid only) is open, and the
        // previous version opened a second one for the same table during a rollback (isPayed only).
        await Bill.createIndexes();
        await bills().insertMany([
            { table: "1", resId: RES, isPaid: false, orders: [], createdAt: at, updatedAt: at },
            { table: "1", resId: RES, isPayed: false, orders: [], createdAt: at, updatedAt: at },
            { table: "2", resId: RES, isPayed: false, orders: [], createdAt: at, updatedAt: at },
        ]);
        const warn = vi.spyOn(logger, "warn");
        const error = vi.spyOn(logger, "error");
        const { bills: migrated } = await prepareDatabase();
        expect(migrated.tablesWithTwoOpenBills).toEqual([{ resId: RES, table: "1", bills: 2 }]);
        expect(await bills().countDocuments({ table: "1", isPaid: false, isPayed: false })).toBe(2);
        expect(await mongoBillsRepo.findOpen(RES, "2")).toMatchObject({ isPaid: false });
        expect(warn).toHaveBeenCalledWith(
            expect.objectContaining({ tablesWithTwoOpenBills: [{ resId: RES, table: "1", bills: 2 }] }),
            expect.stringMatching(/two open bills/),
        );
        expect(error).toHaveBeenCalledWith(expect.anything(), expect.stringMatching(/mark one paid, then restart/));

        // staff mark one paid; the next start builds the one-open-bill index again (VM-08)
        const [first] = await bills().find({ table: "1" }).toArray();
        await mongoBillsRepo.setPaid(RES, String(first!._id), true);
        await prepareDatabase();
        expect((await bills().indexes()).find((i) => i.name === "one_open_bill_per_table")).toMatchObject({ unique: true });
    });
});
