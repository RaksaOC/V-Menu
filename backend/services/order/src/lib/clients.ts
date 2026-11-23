import type { Request } from "express";
import { callService, type RestaurantRef } from "@vmenu/common";

export interface OrderLine {
    item: { _id: string; name: string; price: number; image: string; isEnabled: boolean };
    quantity: number;
}
export interface MenuCounts {
    numOfTables: number;
    numOfActiveTables: number;
    numOfItems: number;
}

// Everything order-service needs from the other two services.
export interface Clients {
    listOwnerRestaurants(req: Request, ownerId: string): Promise<RestaurantRef[]>;
    menuCounts(req: Request, resId: string): Promise<MenuCounts>;
    orderCheck(req: Request, resId: string, body: { table: string; items: { _id: string; quantity: number }[] }): Promise<{ items: OrderLine[] }>;
}

export const httpClients: Clients = {
    listOwnerRestaurants: (req, ownerId) =>
        callService(process.env.RESTAURANT_SERVICE_URL!, `/internal/restaurants?ownerId=${encodeURIComponent(ownerId)}`, req),
    menuCounts: (req, resId) => callService(process.env.MENU_SERVICE_URL!, `/internal/restaurants/${resId}/counts`, req),
    orderCheck: (req, resId, body) =>
        callService(process.env.MENU_SERVICE_URL!, `/internal/restaurants/${resId}/order-check`, req, { method: "POST", body: JSON.stringify(body) }),
};
