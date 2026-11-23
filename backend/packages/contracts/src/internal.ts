import { z } from "zod";
import { ObjectId, label } from "./common.js";

// Calls between services (CL-05): if either side changes a shape, the contract tests fail.

/** restaurant-service → everyone: what other services may know about a restaurant. */
export const RestaurantRef = z.object({ _id: z.string(), name: z.string(), slug: z.string(), ownerId: z.string() });
export type RestaurantRef = z.infer<typeof RestaurantRef>;
export const RestaurantRefList = z.array(RestaurantRef);

/** order-service → menu-service: is the table open, and what do these dishes cost? */
export const OrderCheckRequest = z.object({
    table: label(40),
    items: z
        .array(
            z.object({
                _id: ObjectId,
                quantity: z.number("Must be a number").int("Must be a whole number").min(1, "At least 1").max(99, "At most 99"),
            }),
        )
        .min(1, "At least one item")
        .max(100, "At most 100 items"),
});
export type OrderCheckRequest = z.infer<typeof OrderCheckRequest>;

/** A dish as it was when ordered: the menu's name and price, not the browser's. */
export const OrderedDish = z.object({ _id: z.string(), name: z.string(), price: z.number(), image: z.string(), isEnabled: z.boolean() });
export const OrderLine = z.object({ item: OrderedDish, quantity: z.number().int().min(1) });
export type OrderLine = z.infer<typeof OrderLine>;

export const OrderCheckResponse = z.object({ items: z.array(OrderLine).min(1) });
export type OrderCheckResponse = z.infer<typeof OrderCheckResponse>;

/** menu-service → order-service: the numbers for the dashboards. */
export const MenuCounts = z.object({
    numOfTables: z.number().int().min(0),
    numOfActiveTables: z.number().int().min(0),
    numOfItems: z.number().int().min(0),
});
export type MenuCounts = z.infer<typeof MenuCounts>;
