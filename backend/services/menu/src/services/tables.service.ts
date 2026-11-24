import { assertId, badRequest, HttpError, notFound } from "@vmenu/common";
import type { TablesRepo } from "../repositories/tables.repo.js";
import type { CreateTableBody, UpdateTableBody } from "@vmenu/contracts";

/** Tables, and whether a customer can order from one (CL-04). */
export function tablesService({ tables }: { tables: TablesRepo }) {
    async function existing(resId: string, id: string) {
        assertId(id, "table id");
        const table = await tables.get(resId, id);
        if (!table) throw notFound("Table not found");
        return table;
    }

    return {
        /** For a customer who scanned a table's QR code: a code the page can explain (VM-04). */
        async check(resId: string, name: string) {
            const table = await tables.findByName(resId, name);
            if (!table) throw new HttpError(404, `We couldn't find table ${name}.`, "TABLE_NOT_FOUND");
            if (!table.isEnabled)
                throw new HttpError(404, `Table ${name} isn't open yet. Please ask a staff member to open it.`, "TABLE_CLOSED");
            return { message: "Table is available" };
        },

        list: (resId: string) => tables.list(resId),

        // "manual" uses the given name; anything else takes the next free number, as before.
        async create(resId: string, body: CreateTableBody) {
            let name: string;
            if (body.type === "manual") {
                const given = body.name!.trim(); // the schema requires it for a manual table
                if (await tables.findByName(resId, given)) throw badRequest("Name is taken");
                name = given;
            } else {
                const numbers = (await tables.list(resId)).map((t) => parseInt(t.name)).filter((n) => !isNaN(n));
                name = String(numbers.length ? Math.max(...numbers) + 1 : 1);
            }
            // New tables start closed (decided for VM-04): the cashier opens a table when guests sit
            // down. Scanning a closed table's QR code says so instead of showing the menu.
            return tables.create(resId, { name, isEnabled: false });
        },

        async update(resId: string, id: string, body: UpdateTableBody) {
            const table = await existing(resId, id);
            const fields: UpdateTableBody = {};
            if (body.name && body.name !== table.name) {
                if (await tables.findByName(resId, body.name)) throw badRequest("Name is taken");
                fields.name = body.name;
            }
            if (body.isEnabled !== undefined) fields.isEnabled = body.isEnabled;
            return (await tables.update(resId, id, fields)) ?? table;
        },

        async remove(resId: string, id: string) {
            assertId(id, "table id");
            const removed = await tables.remove(resId, id);
            if (!removed) throw notFound("Table not found");
            return removed;
        },

        /** Cashier or owner opens or closes a table. */
        async setEnabled(resId: string, id: string, isEnabled: boolean) {
            await existing(resId, id); // 400 for a bad id, 404 for another restaurant's, as before
            const table = await tables.update(resId, id, { isEnabled });
            if (!table) throw notFound("Table not found");
            return table;
        },
    };
}
