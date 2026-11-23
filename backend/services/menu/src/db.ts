import { logger } from "@vmenu/common";
import { Table } from "./models/table.model.js";

/**
 * Runs at startup, after connecting (VM-16): builds the "one name per table" index. It can't be
 * built while two tables of a restaurant already share a name (made before the index existed).
 * Then this says so plainly and the service keeps serving; rename one of them and restart.
 * Answers whether the index is in place.
 */
export async function prepareDatabase(): Promise<boolean> {
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
