import { Category } from "../models/category.model.js";

export interface CategoryRecord {
    _id: string;
    name: string;
    sortOrder: number;
    resId: string;
}

/** Every MongoDB query on menu categories (VM-25). Ids are checked by the service first. */
export interface CategoriesRepo {
    /** in the owner's order */
    list(resId: string): Promise<CategoryRecord[]>;
    get(resId: string, id: string): Promise<CategoryRecord | null>;
    /** ignoring case */
    findByName(resId: string, name: string): Promise<CategoryRecord | null>;
    create(resId: string, fields: Pick<CategoryRecord, "name" | "sortOrder">): Promise<CategoryRecord>;
    /** null when there's no such category in this restaurant */
    update(resId: string, id: string, fields: Partial<Pick<CategoryRecord, "name">>): Promise<CategoryRecord | null>;
    /** sortOrder = position in `ids` */
    setOrder(resId: string, ids: string[]): Promise<void>;
    remove(resId: string, id: string): Promise<CategoryRecord | null>;
}

const plain = <T>(doc: T) => doc as unknown as CategoryRecord;
const IGNORE_CASE = { locale: "en", strength: 2 } as const;

export const mongoCategoriesRepo: CategoriesRepo = {
    list: (resId) => Category.find({ resId }).sort({ sortOrder: 1, _id: 1 }).lean<CategoryRecord[]>(),
    get: (resId, id) => Category.findOne({ _id: id, resId }).lean<CategoryRecord>(),
    findByName: (resId, name) => Category.findOne({ resId, name }).collation(IGNORE_CASE).lean<CategoryRecord>(),
    async create(resId, fields) {
        return plain((await Category.create({ ...fields, resId })).toObject());
    },
    update: (resId, id, fields) =>
        Category.findOneAndUpdate({ _id: id, resId }, fields, { new: true, runValidators: true }).lean<CategoryRecord>(),
    async setOrder(resId, ids) {
        await Category.bulkWrite(
            ids.map((id, sortOrder) => ({ updateOne: { filter: { _id: id, resId }, update: { $set: { sortOrder } } } })),
        );
    },
    remove: (resId, id) => Category.findOneAndDelete({ _id: id, resId }).lean<CategoryRecord>(),
};
