import { assertId, HttpError, invalidTableLink, notFound, tableNameLinksAllowed } from "@vmenu/common";
import { QrToken, type TableLink } from "@vmenu/contracts";
import type { OpenBills } from "../clients/open-bills.js";
import { newQrToken } from "../qr-token.js";
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
/**
 * VM-15: bills point at a table by its name. Renaming or deleting a table with an unpaid bill
 * would split the bill or leave it behind, so it's refused until the bill is paid.
 * If order-service can't answer, the error is passed on and nothing changes.
 */
async function noOpenBill(bills: OpenBills, resId: string, name: string) {
    if (await bills.hasOpenBill(resId, name))
        throw new HttpError(409, `Table ${name} has an unpaid bill. Mark it paid, then try again.`, "TABLE_HAS_OPEN_BILL");
}

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
            if (!tableNameLinksAllowed()) throw invalidTableLink(); // SEC-04: before any lookup
            const table = await tables.findByName(resId, name);
            if (!table) throw new HttpError(404, `We couldn't find table ${name}.`, "TABLE_NOT_FOUND");
            if (!table.isEnabled)
                throw new HttpError(404, `Table ${name} isn't open yet. Please ask a staff member to open it.`, "TABLE_CLOSED");
            return { message: "Table is available" };
        },

        /** SEC-04: for a customer with a table's link: its name and whether it's open, nothing else. */
        async openByToken(resId: string, token: string): Promise<TableLink> {
            if (!QrToken.safeParse(token).success) throw invalidTableLink();
            const table = await tables.findByToken(resId, token);
            if (!table) throw invalidTableLink();
            return { table: table.name, isOpen: table.isEnabled };
        },

        /** SEC-04: the owner replaces a table's link; the old one stops working at once. */
        async resetQrToken(resId: string, id: string) {
            await existing(resId, id);
            const table = await tables.update(resId, id, { qrToken: newQrToken() });
            if (!table) throw notFound("Table not found");
            return table;
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

        /** Owner renames, opens or closes a table. A new name needs no unpaid bill on either name (VM-15). */
        async update(resId: string, id: string, body: UpdateTableBody, bills: OpenBills) {
            const table = await existing(resId, id);
            const fields: UpdateTableBody = {};
            if (body.name && body.name !== table.name) {
                if (await tables.findByName(resId, body.name)) throw nameTaken();
                await noOpenBill(bills, resId, table.name);
                await noOpenBill(bills, resId, body.name); // an old, forgotten bill under the new name
                fields.name = body.name;
            }
            if (body.isEnabled !== undefined) fields.isEnabled = body.isEnabled;
            return (await orTaken(() => tables.update(resId, id, fields))) ?? table;
        },

        /** Owner deletes a table that has no unpaid bill (VM-15). */
        async remove(resId: string, id: string, bills: OpenBills) {
            const table = await existing(resId, id);
            await noOpenBill(bills, resId, table.name);
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
