import type mongoose from "mongoose";

// CL-06: bills were stored with `isPayed`; the field is now `isPaid`. This renames it on every
// bill, and drops the indexes built on the old name (VM-08's one-open-bill index and VM-11's
// list index) so they can be rebuilt on the new one. Safe to run any number of times.
// Remove it, and the old name in the API, once every environment has run it (the release after CL-06).
export async function renameIsPayed(db: mongoose.mongo.Db) {
    const bills = db.collection("table_orders");
    const indexes = await bills.indexes().catch(() => []); // a new database has no collection yet
    const droppedIndexes: string[] = [];
    for (const index of indexes) {
        if (!JSON.stringify([index.key, index.partialFilterExpression ?? {}]).includes("isPayed")) continue;
        await bills.dropIndex(index.name!);
        droppedIndexes.push(index.name!);
    }
    const { modifiedCount } = await bills.updateMany({ isPayed: { $exists: true } }, [
        { $set: { isPaid: "$isPayed" } },
        { $unset: "isPayed" },
    ]);
    return { renamed: modifiedCount, droppedIndexes };
}
