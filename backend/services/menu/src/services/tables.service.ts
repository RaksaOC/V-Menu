import { assertId, HttpError, notFound } from "@vmenu/common";
import { TableNameTaken, type TableRecord, type TablesRepo } from "../repositories/tables.repo.js";
import type { CreateTableBody, UpdateTableBody } from "@vmenu/contracts";

/** VM-16: 409, with the field, so the form can say it next to the name. */
const nameTaken = () => new HttpError(409, "Name is taken", "NAME_TAKEN", { name: "Name is taken" });

/** How often an automatic name is tried again when another request took that number first. */
const AUTO_NAME_TRIES = 10;

/** The next free number: one more than the highest table name that is a number. */
async function nextNumber(tables: TablesRepo, resId: string) {
    const numbers = (await tables.list(resId)).map((t) => parseInt(t.name)).filter((n) => !isNaN(n));
    return String(numbers.length ? Math.max(...numbers) + 1 : 1);
}

/** Turns the repository's "name is taken" into the 409 the owner sees. */
async function orTaken<T>(write: () => Promise<T>): Promise<T> {
    try {
        return await write();
    } catch (err) {
        if (err instanceof TableNameTaken) throw nameTaken();
        throw err;
    }
}

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
        // New tables start closed (decided for VM-04): the cashier opens a table when guests sit
        // down. Scanning a closed table's QR code says so instead of showing the menu.
        async create(resId: string, body: CreateTableBody): Promise<TableRecord> {
            if (body.type === "manual") {
                const name = body.name!.trim(); // the schema requires it for a manual table
                if (await tables.findByName(resId, name)) throw nameTaken();
                return orTaken(() => tables.create(resId, { name, isEnabled: false })); // VM-16: or someone was faster
            }
            // VM-16: two clicks at once both see "5" as the next number. The unique index lets one
            // of them have it; the other works the number out again and tries once more.
            for (let attempt = 1; attempt <= AUTO_NAME_TRIES; attempt++) {
                try {
                    return await tables.create(resId, { name: await nextNumber(tables, resId), isEnabled: false });
                } catch (err) {
                    if (!(err instanceof TableNameTaken)) throw err;
                }
            }
            throw new HttpError(409, "Many tables are being added at the same time. Please try again.", "NAME_TAKEN");
        },

        async update(resId: string, id: string, body: UpdateTableBody) {
            const table = await existing(resId, id);
            const fields: UpdateTableBody = {};
            if (body.name && body.name !== table.name) {
                if (await tables.findByName(resId, body.name)) throw nameTaken();
                fields.name = body.name;
            }
            if (body.isEnabled !== undefined) fields.isEnabled = body.isEnabled;
            return (await orTaken(() => tables.update(resId, id, fields))) ?? table;
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
