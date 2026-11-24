import { assertId, badRequest, HttpError } from "@vmenu/common";
import type { ItemsRepo } from "../repositories/items.repo.js";
import type { TablesRepo } from "../repositories/tables.repo.js";
import { str } from "./input.js";

/** What order-service asks menu-service (CL-04). */
export function internalService({ items, tables }: { items: ItemsRepo; tables: TablesRepo }) {
    return {
        async counts(resId: string) {
            const [numOfTables, numOfActiveTables, numOfItems] = await Promise.all([
                tables.count(resId),
                tables.count(resId, { isEnabled: true }),
                items.count(resId),
            ]);
            return { numOfTables, numOfActiveTables, numOfItems };
        },

        // Checks a customer's cart before order-service saves it: the table must be open and every
        // dish still on the menu. Prices come from here, not from the browser.
        async orderCheck(resId: string, body: unknown) {
            const b = (body ?? {}) as { table?: unknown; items?: unknown };
            const table = str(b.table, 40);
            const lines: { _id: string; quantity: number }[] = Array.isArray(b.items) ? b.items : [];
            if (!table || lines.length === 0 || lines.length > 100) throw badRequest("A table and at least one item are required");
            for (const l of lines) {
                assertId(String(l?._id), "item id");
                if (!Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 99) throw badRequest("Quantity must be 1 to 99");
            }
            const open = await tables.findByName(resId, table);
            if (!open?.isEnabled) throw new HttpError(409, "Table is not available", "TABLE_CLOSED");
            const ids = [...new Set(lines.map((l) => String(l._id)))];
            const found = await items.findEnabled(resId, ids);
            if (found.length !== ids.length) throw new HttpError(409, "Some items are no longer available", "ITEMS_UNAVAILABLE");
            const byId = new Map(found.map((i) => [String(i._id), i]));
            return {
                items: lines.map((l) => {
                    const i = byId.get(String(l._id))!;
                    return {
                        item: { _id: String(i._id), name: i.name, price: i.price, image: i.image, isEnabled: i.isEnabled },
                        quantity: l.quantity,
                    };
                }),
            };
        },
    };
}
