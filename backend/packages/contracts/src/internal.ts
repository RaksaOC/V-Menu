import { z } from "zod";
import { ObjectId, QrToken, Role, label, text } from "./common.js";

// Calls between services (CL-05): if either side changes a shape, the contract tests fail.

/** restaurant-service → everyone: what other services may know about a restaurant. */
export const RestaurantRef = z.object({ _id: z.string(), name: z.string(), slug: z.string(), ownerId: z.string() });
export type RestaurantRef = z.infer<typeof RestaurantRef>;
export const RestaurantRefList = z.array(RestaurantRef);

/** every service → restaurant-service: the current session version of this person's role (SEC-03). */
export const SessionVersionQuery = z.object({ uid: text(128), role: Role, resId: text(64).optional() });
export type SessionVersionQuery = z.infer<typeof SessionVersionQuery>;
/** null when they no longer have that role. */
export const SessionVersion = z.object({ version: z.number().int().min(0).nullable() });
export type SessionVersion = z.infer<typeof SessionVersion>;
/** SEC-04: an order names its table one way: by link token, or by name. zod runs this once the
 *  other fields are valid, so a body with other mistakes hears about the table after those. */
export const withOneTable = <T extends z.ZodType<{ table?: unknown; qrToken?: unknown }>>(schema: T) =>
    schema.refine((body) => (body.table === undefined) !== (body.qrToken === undefined), {
        path: ["table"],
        error: (issue) => ((issue.input as { table?: unknown }).table === undefined ? "Required" : "Send a table or a link, not both"),
    });

/** order-service → menu-service: is the table open, and what do these dishes cost? */
export const OrderCheckRequest = withOneTable(
    z.object({
        /** SEC-04: the table is named by its link token, or by name where that setting is on. */
        table: label(40).optional(),
        qrToken: QrToken.optional(),
        items: z
            .array(
                z.object({
                    _id: ObjectId,
                    quantity: z.number("Must be a number").int("Must be a whole number").min(1, "At least 1").max(99, "At most 99"),
                }),
            )
            .min(1, "At least one item")
            .max(100, "At most 100 items"),
    }),
);
export type OrderCheckRequest = z.infer<typeof OrderCheckRequest>;

/** A dish as it was when ordered: the menu's name and price, not the browser's. */
export const OrderedDish = z.object({ _id: z.string(), name: z.string(), price: z.number(), image: z.string(), isEnabled: z.boolean() });
export const OrderLine = z.object({ item: OrderedDish, quantity: z.number().int().min(1) });
export type OrderLine = z.infer<typeof OrderLine>;

/** `table` is the table's current name (SEC-04: the caller may only have its link token). */
export const OrderCheckResponse = z.object({ table: z.string().optional(), items: z.array(OrderLine).min(1) });
export type OrderCheckResponse = z.infer<typeof OrderCheckResponse>;

/** SEC-04: menu-service → order-service: the table a link token belongs to. */
/** VM-15: order-service answers menu-service: does this table have an unpaid bill? */
export const OpenBillCheck = z.object({ open: z.boolean() });
export type OpenBillCheck = z.infer<typeof OpenBillCheck>;

export const TableByToken = z.object({ name: z.string() });
export type TableByToken = z.infer<typeof TableByToken>;

/** menu-service → order-service: the numbers for the dashboards. */
export const MenuCounts = z.object({
    numOfTables: z.number().int().min(0),
    numOfActiveTables: z.number().int().min(0),
    numOfItems: z.number().int().min(0),
});
export type MenuCounts = z.infer<typeof MenuCounts>;
