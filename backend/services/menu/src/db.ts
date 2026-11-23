import mongoose from "mongoose";
import { priceToCents } from "./migrations/price-cents.js";

/** Runs at startup, after connecting and before taking requests. */
export async function prepareDatabase() {
    return priceToCents(mongoose.connection.db!);
}
