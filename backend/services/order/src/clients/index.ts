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
    orderCheck(
        req: Request,
        resId: string,
        body: { table: string; items: { _id: string; quantity: number }[] },
    ): Promise<{ items: OrderLine[] }>;
}

export const httpClients: Clients = {
    listOwnerRestaurants: (req, ownerId) =>
        callService(process.env.RESTAURANT_SERVICE_URL!, `/internal/restaurants?ownerId=${encodeURIComponent(ownerId)}`, req),
    menuCounts: (req, resId) => callService(process.env.MENU_SERVICE_URL!, `/internal/restaurants/${resId}/counts`, req),
    orderCheck: (req, resId, body) =>
        callService(process.env.MENU_SERVICE_URL!, `/internal/restaurants/${resId}/order-check`, req, {
            method: "POST",
            body: JSON.stringify(body),
        }),
};

/** The clients with the incoming request already applied (it carries the caller's identity and
 *  request id to the other services), so the services never see a request. */
export interface BoundClients {
    listOwnerRestaurants(ownerId: string): Promise<RestaurantRef[]>;
    menuCounts(resId: string): Promise<MenuCounts>;
    orderCheck(resId: string, body: { table: string; items: { _id: string; quantity: number }[] }): Promise<{ items: OrderLine[] }>;
}

export function bindClients(clients: Clients, req: Request): BoundClients {
    return {
        listOwnerRestaurants: (ownerId) => clients.listOwnerRestaurants(req, ownerId),
        menuCounts: (resId) => clients.menuCounts(req, resId),
        orderCheck: (resId, body) => clients.orderCheck(req, resId, body),
    };
}
