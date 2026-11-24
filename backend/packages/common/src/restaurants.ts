import type { Request } from "express";
import { callService } from "./internal.js";

export interface RestaurantRef {
    _id: string;
    name: string;
    slug: string;
    ownerId: string;
}
export type LookupRestaurant = (req: Request, slug: string) => Promise<RestaurantRef>;

// Restaurants live in restaurant-service, so a slug is turned into an id by asking it.
// Answers are kept for 30 s, because nearly every request needs one.
const cache = new Map<string, { at: number; value: RestaurantRef }>();
const TTL = 30_000;

export const lookupRestaurant: LookupRestaurant = async (req, slug) => {
    const hit = cache.get(slug);
    if (hit && Date.now() - hit.at < TTL) return hit.value;
    const value = await callService<RestaurantRef>(process.env.RESTAURANT_SERVICE_URL!, `/internal/restaurants/by-slug/${encodeURIComponent(slug)}`, req);
    cache.set(slug, { at: Date.now(), value });
    return value;
};
