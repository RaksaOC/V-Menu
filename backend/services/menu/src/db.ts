import mongoose from "mongoose";
import { logger } from "@vmenu/common";
import { priceToCents } from "./migrations/price-cents.js";
import { Table } from "./models/table.model.js";
import { newQrToken } from "./qr-token.js";

/** SEC-04: tables from before link tokens get one. Existing tokens are never changed. */
async function giveTablesTokens() {
    const missing = await Table.find({ qrToken: mongoose.trusted({ $exists: false }) }, { _id: 1 }).lean();
    if (!missing.length) return;
    await Table.bulkWrite(
        missing.map(({ _id }) => ({
            updateOne: {
                filter: { _id, qrToken: mongoose.trusted({ $exists: false }) },
                update: { $set: { qrToken: newQrToken() } },
                timestamps: false,
            },
        })),
    );
    logger.info({ tables: missing.length }, "gave tables their QR link tokens");
}

/** VM-16: "one name per table". It can't be built while two tables of a restaurant already share a
 *  name (made before the index existed). Then this says so plainly and the service keeps serving;
 *  rename one of them and restart. Answers whether the index is in place. */
async function buildIndexes() {
    try {
        await Table.createIndexes();
        return true;
    } catch (err) {
        logger.error(
            { err },
            "could not build the unique table-name index: two tables of a restaurant share a name; rename one, then restart",
        );
        return false;
    }
}

/**
 * Runs at startup, after connecting and before taking requests, in this order:
 * 1. dish prices in cents (CL-07), the data migration;
 * 2. a link token for older tables (SEC-04);
 * 3. the indexes, among them one name per table (VM-16).
 */
export async function prepareDatabase() {
    const prices = await priceToCents(mongoose.connection.db!);
    await giveTablesTokens();
    const tableNameIndex = await buildIndexes();
    return { prices, tableNameIndex };
}
