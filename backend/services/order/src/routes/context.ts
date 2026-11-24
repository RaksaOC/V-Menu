import type { Request } from "express";
import { assertRestaurantAccess, type LookupRestaurant, type RestaurantRef } from "@vmenu/common";
import type { billsService } from "../services/bills.service.js";
import type { kitchenService } from "../services/kitchen.service.js";
import type { ordersService } from "../services/orders.service.js";
import type { requestsService } from "../services/requests.service.js";
import type { statsService } from "../services/stats.service.js";
import type { tableService } from "../services/table.service.js";

/** What every router needs: the services for this request, and the restaurant in the URL. */
export interface RouteContext {
    services(req: Request): {
        orders: ReturnType<typeof ordersService>;
        kitchen: ReturnType<typeof kitchenService>;
        bills: ReturnType<typeof billsService>;
        stats: ReturnType<typeof statsService>;
        table: ReturnType<typeof tableService>;
        requests: ReturnType<typeof requestsService>;
    };
    restaurant(req: Request): Promise<RestaurantRef>;
}

/** The restaurant named by :slug; a signed-in staff member must belong to it. */
export function restaurantFrom(lookupRestaurant: LookupRestaurant) {
    return async (req: Request) => {
        const restaurant = await lookupRestaurant(req, String(req.params.slug));
        if (req.user) assertRestaurantAccess(req.user, restaurant);
        return restaurant;
    };
}
