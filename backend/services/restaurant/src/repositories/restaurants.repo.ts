import mongoose from "mongoose";
import type { UpdateSettingsBody } from "@vmenu/contracts";
import { Restaurant } from "../models/restaurant.model.js";

export interface RestaurantRecord {
    _id: string;
    name: string;
    slug: string;
    ownerId: string;
    settings?: UpdateSettingsBody;
    createdAt: Date;
}

/** Every MongoDB query on restaurants (CL-04). */
export interface RestaurantsRepo {
    bySlug(slug: string): Promise<RestaurantRecord | null>;
    byIds(ids: string[]): Promise<RestaurantRecord[]>;
    /** oldest first */
    ownedBy(ownerId: string): Promise<RestaurantRecord[]>;
    create(fields: Pick<RestaurantRecord, "name" | "slug" | "ownerId">): Promise<RestaurantRecord>;
    /** VM-24: changes only the settings given; null removes one. */
    updateSettings(id: string, settings: UpdateSettingsBody): Promise<RestaurantRecord | null>;
}

const withStringId = <T extends { _id: unknown }>(r: T) => ({ ...r, _id: String(r._id) }) as unknown as RestaurantRecord;

export const mongoRestaurantsRepo: RestaurantsRepo = {
    async bySlug(slug) {
        const r = await Restaurant.findOne({ slug }).lean();
        return r ? withStringId(r) : null;
    },
    // the ids come from our own memberships, not from a request; sanitizeFilter would strip the $in
    byIds: (ids) => Restaurant.find({ _id: mongoose.trusted({ $in: ids }) }).lean<RestaurantRecord[]>(),
    ownedBy: (ownerId) => Restaurant.find({ ownerId }).sort({ createdAt: 1 }).lean<RestaurantRecord[]>(),
    async updateSettings(id, settings) {
        const $set = Object.fromEntries(Object.entries(settings).map(([k, v]) => [`settings.${k}`, v]));
        const r = Object.keys($set).length
            ? await Restaurant.findByIdAndUpdate(id, { $set }, { new: true, runValidators: true }).lean()
            : await Restaurant.findById(id).lean();
        return r ? withStringId(r) : null;
    },
    async create(fields) {
        return withStringId((await Restaurant.create(fields)).toObject());
    },
};
