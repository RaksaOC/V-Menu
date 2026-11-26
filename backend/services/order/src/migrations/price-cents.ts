import { toCents } from "@vmenu/contracts";
import type mongoose from "mongoose";

const BATCH = 500;

interface StoredLine {
    item?: { price?: number; priceCents?: number };
    quantity: number;
}

// CL-07: each order line keeps a copy of the dish; that copy gets `priceCents` next to its `price`
// in dollars. `price` stays for one release, so the previous version still works after a rollback.
// Only orders with no cents yet are read, so it's safe to run any number of times.
export async function linesToCents(db: mongoose.mongo.Db) {
    const orders = db.collection("orders");
    let writes: mongoose.mongo.AnyBulkWriteOperation[] = [];
    let migrated = 0;
    let rounded = 0;
    const todo = orders.find(
        { "orderedItems.item": { $exists: true }, "orderedItems.item.priceCents": { $exists: false } },
        { projection: { orderedItems: 1 } },
    );
    for await (const order of todo) {
        const orderedItems = (order.orderedItems as StoredLine[]).map((line) => {
            if (!line.item) return line;
            const price = line.item.price ?? 0;
            const priceCents = toCents(price);
            if (Math.abs(price * 100 - priceCents) > 1e-6) rounded++;
            return { ...line, item: { ...line.item, priceCents } };
        });
        writes.push({ updateOne: { filter: { _id: order._id }, update: { $set: { orderedItems } } } });
        migrated++;
        if (writes.length === BATCH) {
            await orders.bulkWrite(writes);
            writes = [];
        }
    }
    if (writes.length) await orders.bulkWrite(writes);
    return { migrated, rounded };
}
