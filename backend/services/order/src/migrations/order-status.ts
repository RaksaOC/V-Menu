import type mongoose from "mongoose";

// VM-27: orders were only done or not (`isDone`); now they have a `status`. Done orders become
// "served", the rest "pending", each with one history entry. VM-10's queue index was built on
// isDone, so it's dropped and rebuilt on status. Safe to run any number of times.
//
// `isDone` stays on every order for one release (this code writes it with status, see
// orders.repo.ts: true once ready or served), so a rollback to the previous version still shows the
// kitchen the right orders. So this also:
// - moves an order the previous version marked done after a rollback (isDone, but still pending
//   or preparing here) to "served", as the first step does;
// - sets isDone where it's missing: orders written before it was kept.
//
// When to remove: in the release after this one is in production, drop isDone from order.model.ts
// and orders.repo.ts and remove this file and its call in db.ts. The stored field can then be
// cleared with db.orders.updateMany({}, { $unset: { isDone: "" } }).
export async function isDoneToStatus(db: mongoose.mongo.Db) {
    const orders = db.collection("orders");
    const indexes = await orders.indexes().catch(() => []); // a new database has no collection yet
    const droppedIndexes: string[] = [];
    for (const index of indexes) {
        if (!JSON.stringify(index.key).includes("isDone")) continue;
        await orders.dropIndex(index.name!);
        droppedIndexes.push(index.name!);
    }
    const at = { $ifNull: ["$updatedAt", "$createdAt"] };
    const status = { $cond: ["$isDone", "served", "pending"] };
    const fromIsDone = await orders.updateMany({ isDone: { $exists: true }, status: { $exists: false } }, [
        { $set: { status, statusHistory: [{ status, at, by: "migration" }] } },
    ]);
    const doneDuringRollback = await orders.updateMany({ isDone: true, status: { $in: ["pending", "preparing"] } }, [
        {
            $set: {
                status: "served",
                statusHistory: { $concatArrays: [{ $ifNull: ["$statusHistory", []] }, [{ status: "served", at, by: "migration" }]] },
            },
        },
    ]);
    const { modifiedCount: backfilled } = await orders.updateMany({ status: { $exists: true }, isDone: { $exists: false } }, [
        { $set: { isDone: { $in: ["$status", ["ready", "served"]] } } }, // as isDoneFor() in orders.repo.ts
    ]);
    return { migrated: fromIsDone.modifiedCount + doneDuringRollback.modifiedCount, backfilled, droppedIndexes };
}
