import { Table } from "../models/table.model.js";

export interface TableRecord {
    _id: string;
    name: string;
    isEnabled: boolean;
    resId: string;
    qrToken: string; // SEC-04
}
export type TableFields = Partial<Pick<TableRecord, "name" | "isEnabled" | "qrToken">>;

/** VM-16: another table of this restaurant already has the name (the unique index said so). */
export class TableNameTaken extends Error {
    constructor(public tableName: string) {
        super(`Table name "${tableName}" is taken`);
    }
}

const isDuplicateKey = (err: unknown) => (err as { code?: unknown } | null)?.code === 11000;

/** Runs a write; a duplicate-key error from the unique name index becomes TableNameTaken. */
async function uniqueName<T>(name: string | undefined, write: () => Promise<T>): Promise<T> {
    try {
        return await write();
    } catch (err) {
        if (isDuplicateKey(err)) throw new TableNameTaken(name ?? "");
        throw err;
    }
}

/** Every MongoDB query on tables (CL-04). Ids are checked by the services first. */
export interface TablesRepo {
    list(resId: string): Promise<TableRecord[]>;
    get(resId: string, id: string): Promise<TableRecord | null>;
    findByName(resId: string, name: string): Promise<TableRecord | null>;
    /** SEC-04: the table this link token belongs to, in this restaurant. */
    findByToken(resId: string, qrToken: string): Promise<TableRecord | null>;
    /** Throws TableNameTaken when the name is used (VM-16). */
    create(resId: string, fields: Pick<TableRecord, "name" | "isEnabled">): Promise<TableRecord>;
    /** null when there's no such table in this restaurant. Throws TableNameTaken when the new name is used (VM-16). */
    update(resId: string, id: string, fields: TableFields): Promise<TableRecord | null>;
    remove(resId: string, id: string): Promise<TableRecord | null>;
    count(resId: string, where?: { isEnabled?: boolean }): Promise<number>;
}

export const mongoTablesRepo: TablesRepo = {
    list: (resId) => Table.find({ resId }).lean<TableRecord[]>(),
    get: (resId, id) => Table.findOne({ _id: id, resId }).lean<TableRecord>(),
    findByName: (resId, name) => Table.findOne({ name, resId }).lean<TableRecord>(),
    findByToken: (resId, qrToken) => Table.findOne({ qrToken, resId }).lean<TableRecord>(),
    create: (resId, fields) =>
        uniqueName(fields.name, async () => (await Table.create({ ...fields, resId })).toObject() as unknown as TableRecord),
    update: (resId, id, fields) =>
        uniqueName(fields.name, () =>
            Table.findOneAndUpdate({ _id: id, resId }, fields, { new: true, runValidators: true }).lean<TableRecord>(),
        ),
    remove: (resId, id) => Table.findOneAndDelete({ _id: id, resId }).lean<TableRecord>(),
    count: (resId, { isEnabled } = {}) => Table.countDocuments(isEnabled === undefined ? { resId } : { resId, isEnabled }),
};
