import { HttpError, invalidTableLink } from "@vmenu/common";
import { QrToken, type OrderCheckRequest, type OrderCheckResponse } from "@vmenu/contracts";
import type { ItemsRepo } from "../repositories/items.repo.js";
import type { TablesRepo } from "../repositories/tables.repo.js";

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

        /** SEC-04: the table a link token belongs to, open or not (a customer may read their bill). */
        async tableByToken(resId: string, token: string) {
            const table = QrToken.safeParse(token).success ? await tables.findByToken(resId, token) : null;
            if (!table) throw invalidTableLink();
            return { name: table.name };
        },

        // Checks a customer's cart before order-service saves it: the table must be open and every
        // dish still on the menu. Prices come from here, not from the browser.
        async orderCheck(resId: string, { table, qrToken, items: lines }: OrderCheckRequest): Promise<OrderCheckResponse> {
            // SEC-04: order-service decides whether a name may be used at all
            const open = qrToken ? await tables.findByToken(resId, qrToken) : await tables.findByName(resId, table!);
            if (qrToken && !open) throw invalidTableLink();
            if (!open?.isEnabled) throw new HttpError(409, "Table is not available", "TABLE_CLOSED");
            const ids = [...new Set(lines.map((l) => String(l._id)))];
            const found = await items.findEnabled(resId, ids);
            if (found.length !== ids.length) throw new HttpError(409, "Some items are no longer available", "ITEMS_UNAVAILABLE");
            const byId = new Map(found.map((i) => [String(i._id), i]));
            return {
                table: open.name,
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
