import mongoose from "mongoose";
import { logger } from "@vmenu/common";
import { renameIsPayed } from "./migrations/is-paid.js";
import { isDoneToStatus } from "./migrations/order-status.js";
import { Bill } from "./models/bill.model.js";
import { Order } from "./models/order.model.js";

/**
 * Runs at startup, after connecting and before taking requests: the data migrations first, then
 * the indexes. Mongoose's own index building is off (autoIndex: false in index.ts), so an index
 * on the new field name is never built before the old one is dropped (CL-06).
 */
export async function prepareDatabase() {
    const db = mongoose.connection.db!;
    const migrated = { bills: await renameIsPayed(db), orders: await isDoneToStatus(db) }; // CL-06, VM-27
    await Order.createIndexes();
    try {
        await Bill.createIndexes();
    } catch (err) {
        // VM-08: the "one open bill per table" index can't be built while some table already has
        // two open bills (from before it existed). Say so plainly; keep serving.
        logger.error({ err }, "could not build the one-open-bill-per-table index: a table has two open bills; mark one paid, then restart");
    }
    return migrated;
}
