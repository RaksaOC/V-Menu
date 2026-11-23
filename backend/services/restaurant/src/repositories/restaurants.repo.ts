import mongoose from "mongoose";
import { Restaurant } from "../models/restaurant.model.js";

export interface RestaurantRecord {
    _id: string;
    name: string;
    slug: string;
    ownerId: string;
    createdAt: Date;
}

/** Every MongoDB query on restaurants (CL-04). */
export interface RestaurantsRepo {
    bySlug(slug: string): Promise<RestaurantRecord | null>;
    byIds(ids: string[]): Promise<RestaurantRecord[]>;
    /** oldest first */
    ownedBy(ownerId: string): Promise<RestaurantRecord[]>;
    create(fields: Pick<RestaurantRecord, "name" | "slug" | "ownerId">): Promise<RestaurantRecord>;
}

const withStringId = <T extends { _id: unknown }>(r: T) => ({ ...r, _id: String(r._id) }) as unknown as RestaurantRecord;

export const mongoRestaurantsRepo: RestaurantsRepo = {
    async bySlug(slug) {
        const r = await Restaurant.findOne({ slug }).lean();
        return r ? withStringId(r) : null;
    },
    // the ids come from our own tenants, not from a request; sanitizeFilter would strip the $in
    byIds: (ids) => Restaurant.find({ _id: mongoose.trusted({ $in: ids }) }).lean<RestaurantRecord[]>(),
    ownedBy: (ownerId) => Restaurant.find({ ownerId }).sort({ createdAt: 1 }).lean<RestaurantRecord[]>(),
    async create(fields) {
        return withStringId((await Restaurant.create(fields)).toObject());
    },
};
