import type { NextFunction, Request, Response } from "express";
import { assertRestaurantAccess, HttpError, type LookupRestaurant, type RestaurantRef } from "@vmenu/common";
import type { categoriesService } from "../services/categories.service.js";
import type { imagesService } from "../services/images.service.js";
import type { internalService } from "../services/internal.service.js";
import type { itemsService } from "../services/items.service.js";
import type { OpenBillsFor } from "../clients/open-bills.js";
import type { tablesService } from "../services/tables.service.js";

/** What every router needs: the services, and the restaurant in the URL. */
export interface RouteContext {
    services: {
        items: ReturnType<typeof itemsService>;
        categories: ReturnType<typeof categoriesService>;
        tables: ReturnType<typeof tablesService>;
        images: ReturnType<typeof imagesService>;
        internal: ReturnType<typeof internalService>;
    };
    /** The restaurant named by :slug; a signed-in staff member must belong to it. */
    restaurant(req: Request): Promise<RestaurantRef>;
    /** The same, for customers: an unknown restaurant gets a code the page can explain (VM-04). */
    publicRestaurant(req: Request): Promise<RestaurantRef>;
    /** VM-15: order-service, asked before a table is renamed or deleted */
    openBills: OpenBillsFor;
}

export function restaurantFrom(lookupRestaurant: LookupRestaurant) {
    const restaurant = async (req: Request) => {
        const r = await lookupRestaurant(req, String(req.params.slug));
        if (req.user) assertRestaurantAccess(req.user, r);
        return r;
    };
    // Other failures (restaurant-service down: 503) pass through, so the page can offer Try again.
    const publicRestaurant = async (req: Request) => {
        try {
            return await restaurant(req);
        } catch (err) {
            if (err instanceof HttpError && err.status === 404)
                throw new HttpError(404, "We couldn't find this restaurant.", "RESTAURANT_NOT_FOUND");
            throw err;
        }
    };
    return { restaurant, publicRestaurant };
}

/** Route middleware: checks access to the restaurant in the URL before the body is validated,
 *  so a caller without access gets 403, never a 400 about the body (SEC-07, CL-05). */
export function withRestaurant({ restaurant }: Pick<RouteContext, "restaurant">) {
    return async (req: Request, res: Response, next: NextFunction) => {
        res.locals.restaurant = await restaurant(req);
        next();
    };
}
