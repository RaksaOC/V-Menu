import type { Request } from "express";
import { callService, HttpError, type Schema } from "@vmenu/common";
import { MenuCounts, OrderCheckResponse, RestaurantRefList, type OrderCheckRequest, type RestaurantRef } from "@vmenu/contracts";

export type { MenuCounts, OrderLine, RestaurantRef } from "@vmenu/contracts";

// CL-05: answers from the other services are read with the shared schemas. A changed shape is a
// 502 here, instead of a broken order or dashboard further on.
function checked<T>(schema: Schema<T>, service: string) {
    return (answer: unknown): T => {
        const result = schema.safeParse(answer);
        if (!result.success) throw new HttpError(502, `${service} answered in an unexpected shape`, "UPSTREAM_CONTRACT");
        return result.data;
    };
}

// Everything order-service needs from the other two services.
export interface Clients {
    listOwnerRestaurants(req: Request, ownerId: string): Promise<RestaurantRef[]>;
    menuCounts(req: Request, resId: string): Promise<MenuCounts>;
    orderCheck(req: Request, resId: string, body: OrderCheckRequest): Promise<OrderCheckResponse>;
}

export const httpClients: Clients = {
    listOwnerRestaurants: (req, ownerId) =>
        callService(process.env.RESTAURANT_SERVICE_URL!, `/internal/restaurants?ownerId=${encodeURIComponent(ownerId)}`, req).then(
            checked(RestaurantRefList, "restaurant-service"),
        ),
    menuCounts: (req, resId) =>
        callService(process.env.MENU_SERVICE_URL!, `/internal/restaurants/${resId}/counts`, req).then(checked(MenuCounts, "menu-service")),
    orderCheck: (req, resId, body) =>
        callService(process.env.MENU_SERVICE_URL!, `/internal/restaurants/${resId}/order-check`, req, {
            method: "POST",
            body: JSON.stringify(body),
        }).then(checked(OrderCheckResponse, "menu-service")),
};

/** The clients with the incoming request already applied (it carries the caller's identity and
 *  request id to the other services), so the services never see a request. */
export interface BoundClients {
    listOwnerRestaurants(ownerId: string): Promise<RestaurantRef[]>;
    menuCounts(resId: string): Promise<MenuCounts>;
    orderCheck(resId: string, body: OrderCheckRequest): Promise<OrderCheckResponse>;
}

export function bindClients(clients: Clients, req: Request): BoundClients {
    return {
        listOwnerRestaurants: (ownerId) => clients.listOwnerRestaurants(req, ownerId),
        menuCounts: (resId) => clients.menuCounts(req, resId),
        orderCheck: (resId, body) => clients.orderCheck(req, resId, body),
    };
}
