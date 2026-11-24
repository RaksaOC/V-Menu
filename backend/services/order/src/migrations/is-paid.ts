import type mongoose from "mongoose";
import { logger } from "@vmenu/common";

const isDuplicateKey = (err: unknown) => (err as { code?: number })?.code === 11000;

export interface TableWithTwoOpenBills {
    resId: string;
    table: string;
    bills: number;
}

// CL-06: bills were stored with `isPayed`; the field is now `isPaid`. This copies the old field to
// the new one, and drops the indexes built on the old name (VM-08's one-open-bill index and VM-11's
// list index) so they can be rebuilt on the new one. Safe to run any number of times.
//
// Both names stay on every bill for one release (this code writes both, see bills.repo.ts), so a
// rollback to the previous version still sees which bills are paid. So this also:
// - copies isPayed to isPaid where they differ: what the previous version changed after a rollback;
// - copies isPaid to isPayed where it's missing: bills written before both names were kept.
//
// When to remove: in the release after this one is in production, drop isPayed from bill.model.ts
// and bills.repo.ts, remove this file and its call in db.ts, and the API's old name (CL-06). The
// stored field can then be cleared with db.table_orders.updateMany({}, { $unset: { isPayed: "" } }).
export async function renameIsPayed(db: mongoose.mongo.Db) {
    const bills = db.collection("table_orders");
    const indexes = await bills.indexes().catch(() => []); // a new database has no collection yet
    const droppedIndexes: string[] = [];
    for (const index of indexes) {
        if (!JSON.stringify([index.key, index.partialFilterExpression ?? {}]).includes("isPayed")) continue;
        await bills.dropIndex(index.name!);
        droppedIndexes.push(index.name!);
    }

    const fromOldName = { isPayed: { $exists: true }, $expr: { $ne: ["$isPaid", "$isPayed"] } };
    const copyOldName = [{ $set: { isPaid: "$isPayed" } }];
    const renamed = await bills.countDocuments(fromOldName);
    let tablesWithTwoOpenBills: TableWithTwoOpenBills[] = [];
    try {
        await bills.updateMany(fromOldName, copyOldName);
    } catch (err) {
        if (!isDuplicateKey(err)) throw err;
        // A table has two open bills: one this version opened, and one the previous version opened
        // after a rollback. Refusing to start would take every restaurant's ordering down, and
        // hiding one bill would hide its orders from the cashier. So both stay open, the
        // one-open-bill index is dropped, and staff see both bills and mark one paid. Until then
        // prepareDatabase can't rebuild the index and logs that; the next start after rebuilds it.
        for (const index of await bills.indexes()) {
            if (!index.unique || !JSON.stringify(index.partialFilterExpression ?? {}).includes("isPaid")) continue;
            await bills.dropIndex(index.name!);
            droppedIndexes.push(index.name!);
        }
        await bills.updateMany(fromOldName, copyOldName);
        tablesWithTwoOpenBills = await bills
            .aggregate<TableWithTwoOpenBills>([
                { $match: { isPaid: false } },
                { $group: { _id: { resId: "$resId", table: "$table" }, bills: { $sum: 1 } } },
                { $match: { bills: { $gt: 1 } } },
                { $project: { _id: 0, resId: "$_id.resId", table: "$_id.table", bills: 1 } },
                { $sort: { resId: 1, table: 1 } },
            ])
            .toArray();
        logger.warn(
            { tablesWithTwoOpenBills },
            "some tables have two open bills (one opened during a rollback); both stay open: staff should mark one paid",
        );
    }

    const { modifiedCount: backfilled } = await bills.updateMany({ isPaid: { $exists: true }, isPayed: { $exists: false } }, [
        { $set: { isPayed: "$isPaid" } },
    ]);
    return { renamed, backfilled, droppedIndexes, tablesWithTwoOpenBills };
}
