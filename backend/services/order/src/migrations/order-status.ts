import type mongoose from "mongoose";

// VM-27: orders were only done or not (`isDone`); now they have a `status`. Done orders become
// "served", the rest "pending", each with one history entry. VM-10's queue index was built on
// isDone, so it's dropped and rebuilt on status. Safe to run any number of times.
export async function isDoneToStatus(db: mongoose.mongo.Db) {
    const orders = db.collection("orders");
    const indexes = await orders.indexes().catch(() => []); // a new database has no collection yet
    const droppedIndexes: string[] = [];
    for (const index of indexes) {
        if (!JSON.stringify(index.key).includes("isDone")) continue;
        await orders.dropIndex(index.name!);
        droppedIndexes.push(index.name!);
    }
    const status = { $cond: ["$isDone", "served", "pending"] };
    const { modifiedCount } = await orders.updateMany({ isDone: { $exists: true } }, [
        { $set: { status, statusHistory: [{ status, at: { $ifNull: ["$updatedAt", "$createdAt"] }, by: "migration" }] } },
        { $unset: "isDone" },
    ]);
    return { migrated: modifiedCount, droppedIndexes };
}
