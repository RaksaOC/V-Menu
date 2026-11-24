import mongoose from "mongoose";
import { Item } from "../models/item.model.js";

export interface ItemRecord {
    _id: string;
    name: string;
    priceCents: number;
    /** @deprecated CL-07: priceCents / 100, kept for a rollback */
    price?: number;
    image: string;
    isEnabled: boolean;
    resId: string;
    categoryId?: string | null;
    description?: string; // VM-26: dishes from before it have neither
    tags?: string[];
}
export type ItemFields = Partial<Pick<ItemRecord, "name" | "priceCents" | "image" | "isEnabled" | "categoryId" | "description" | "tags">>;

/** Every MongoDB query on menu items (CL-04). Ids are checked by the services first. */
export interface ItemsRepo {
    list(resId: string): Promise<ItemRecord[]>;
    get(resId: string, id: string): Promise<ItemRecord | null>;
    create(resId: string, fields: ItemFields & Pick<ItemRecord, "name" | "priceCents" | "image">): Promise<ItemRecord>;
    /** null when there's no such item in this restaurant */
    update(resId: string, id: string, fields: ItemFields): Promise<ItemRecord | null>;
    remove(resId: string, id: string): Promise<ItemRecord | null>;
    count(resId: string): Promise<number>;
    /** the enabled items among these ids */
    findEnabled(resId: string, ids: string[]): Promise<ItemRecord[]>;
    /** VM-25: a deleted category's dishes go to "Other"; answers how many moved */
    clearCategory(resId: string, categoryId: string): Promise<number>;
}

const plain = <T>(doc: T) => doc as unknown as ItemRecord;
/** CL-07: writes the old dollar price too, whenever the price changes. */
const withOldPrice = <T extends ItemFields>(fields: T) =>
    fields.priceCents === undefined ? fields : { ...fields, price: fields.priceCents / 100 };

export const mongoItemsRepo: ItemsRepo = {
    list: (resId) => Item.find({ resId }).lean<ItemRecord[]>(),
    get: (resId, id) => Item.findOne({ _id: id, resId }).lean<ItemRecord>(),
    async create(resId, fields) {
        return plain((await Item.create({ ...withOldPrice(fields), resId })).toObject());
    },
    update: (resId, id, fields) =>
        Item.findOneAndUpdate({ _id: id, resId }, withOldPrice(fields), { new: true, runValidators: true }).lean<ItemRecord>(),
    remove: (resId, id) => Item.findOneAndDelete({ _id: id, resId }).lean<ItemRecord>(),
    count: (resId) => Item.countDocuments({ resId }),
    // ids were checked to be ObjectIds; sanitizeFilter would strip the $in otherwise
    findEnabled: (resId, ids) => Item.find({ _id: mongoose.trusted({ $in: ids }), resId, isEnabled: true }).lean<ItemRecord[]>(),
    async clearCategory(resId, categoryId) {
        return (await Item.updateMany({ resId, categoryId }, { categoryId: null })).modifiedCount;
    },
};
