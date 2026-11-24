import { toCents } from "@vmenu/contracts";
import type mongoose from "mongoose";

const BATCH = 500;

// CL-07: dishes get `priceCents` next to their `price` in dollars. `price` stays for one release,
// so the previous version still works after a rollback. A dish whose price the previous version
// changed is picked up too, because its cents no longer match. Safe to run any number of times.
export async function priceToCents(db: mongoose.mongo.Db) {
    const items = db.collection("items");
    let writes: mongoose.mongo.AnyBulkWriteOperation[] = [];
    let migrated = 0;
    let rounded = 0;
    for await (const item of items.find({ price: { $type: "number" } }, { projection: { price: 1, priceCents: 1 } })) {
        const priceCents = toCents(item.price);
        if (item.priceCents === priceCents) continue;
        if (Math.abs(item.price * 100 - priceCents) > 1e-6) rounded++;
        writes.push({ updateOne: { filter: { _id: item._id }, update: { $set: { priceCents } } } });
        migrated++;
        if (writes.length === BATCH) {
            await items.bulkWrite(writes);
            writes = [];
        }
    }
    if (writes.length) await items.bulkWrite(writes);
    return { migrated, rounded };
}
