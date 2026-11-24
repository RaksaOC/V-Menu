import { Table } from "../models/table.model.js";

export interface TableRecord {
    _id: string;
    name: string;
    isEnabled: boolean;
    resId: string;
}
export type TableFields = Partial<Pick<TableRecord, "name" | "isEnabled">>;

/** Every MongoDB query on tables (CL-04). Ids are checked by the services first. */
export interface TablesRepo {
    list(resId: string): Promise<TableRecord[]>;
    get(resId: string, id: string): Promise<TableRecord | null>;
    findByName(resId: string, name: string): Promise<TableRecord | null>;
    create(resId: string, fields: Pick<TableRecord, "name" | "isEnabled">): Promise<TableRecord>;
    /** null when there's no such table in this restaurant */
    update(resId: string, id: string, fields: TableFields): Promise<TableRecord | null>;
    remove(resId: string, id: string): Promise<TableRecord | null>;
    count(resId: string, where?: { isEnabled?: boolean }): Promise<number>;
}

export const mongoTablesRepo: TablesRepo = {
    list: (resId) => Table.find({ resId }).lean<TableRecord[]>(),
    get: (resId, id) => Table.findOne({ _id: id, resId }).lean<TableRecord>(),
    findByName: (resId, name) => Table.findOne({ name, resId }).lean<TableRecord>(),
    async create(resId, fields) {
        return (await Table.create({ ...fields, resId })).toObject() as unknown as TableRecord;
    },
    update: (resId, id, fields) =>
        Table.findOneAndUpdate({ _id: id, resId }, fields, { new: true, runValidators: true }).lean<TableRecord>(),
    remove: (resId, id) => Table.findOneAndDelete({ _id: id, resId }).lean<TableRecord>(),
    count: (resId, { isEnabled } = {}) => Table.countDocuments(isEnabled === undefined ? { resId } : { resId, isEnabled }),
};
