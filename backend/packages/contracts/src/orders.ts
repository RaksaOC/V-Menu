import { z } from "zod";
import { Cents, IsoDate, ObjectId, QrToken, label, pageOf, text } from "./common.js";
import { OrderLine, withOneTable } from "./internal.js";

// order-service: orders, bills and the dashboards (CL-05).

/** VM-22: the most lines one order can have. */
export const MAX_ORDER_LINES = 50;

/** VM-28: the longest note on one line ("no chilli"), and on the whole order. */
export const LINE_NOTE_MAX = 100;
export const ORDER_NOTE_MAX = 200;

/** A customer's note: spaces and line breaks become one space, then it's trimmed and limited. */
const note = (max: number, what: string) =>
    z
        .string("Must be text")
        .transform((v) => v.replace(/\s+/g, " ").trim())
        .pipe(z.string().max(max, `${what} can be at most ${max} characters`))
        .optional();
/** An empty note is no note: the key is left out. */
function withoutEmptyNote<T extends { note?: string }>({ note, ...rest }: T): Omit<T, "note"> & { note?: string } {
    return note ? { ...rest, note } : rest;
}

/** What the cart sends. The browser's prices are ignored: menu-service supplies them. */
export const PlaceOrderBody = withOneTable(
    z
        .object({
            /** SEC-04: customers send the table's link token; a name works only where that setting is on. */
            table: label(40).optional(),
            qrToken: QrToken.optional(),
            orderedItems: z
                .array(
                    z
                        .object({
                            item: z.object({ _id: ObjectId }),
                            quantity: z.number("Must be a number").int("Must be a whole number").min(1, "At least 1").max(99, "At most 99"),
                            note: note(LINE_NOTE_MAX, "A note"),
                        })
                        .transform(withoutEmptyNote),
                )
                .min(1, "At least one item")
                .max(MAX_ORDER_LINES, `At most ${MAX_ORDER_LINES} lines`),
            note: note(ORDER_NOTE_MAX, "The order's note"),
        })
        .transform(withoutEmptyNote),
);
export type PlaceOrderBody = z.infer<typeof PlaceOrderBody>;

/** CL-06: the field is `isPaid`. The old `isPayed` is still accepted for one release. */
export const UpdateBillBody = z.preprocess(
    (body) =>
        body && typeof body === "object" && !("isPaid" in body) && "isPayed" in body
            ? { isPaid: (body as { isPayed: unknown }).isPayed }
            : body,
    z.object({ isPaid: z.boolean("Must be true or false") }),
);
export type UpdateBillBody = z.infer<typeof UpdateBillBody>;

/** VM-27: an order's steps. The kitchen moves it one step at a time; the cashier can cancel it. */
export const ORDER_STATUSES = ["pending", "preparing", "ready", "served", "cancelled"] as const;
export const OrderStatus = z.enum(ORDER_STATUSES, "Must be pending, preparing, ready, served or cancelled");
export type OrderStatus = z.infer<typeof OrderStatus>;
/** The only step the kitchen may take from each status. */
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = { pending: "preparing", preparing: "ready", ready: "served" };
/** Still the kitchen's to do. */
export const ACTIVE_STATUSES: OrderStatus[] = ["pending", "preparing", "ready"];

export const UpdateOrderStatusBody = z.object({ status: OrderStatus });
export type UpdateOrderStatusBody = z.infer<typeof UpdateOrderStatusBody>;
export const CancelOrderBody = z.object({ reason: text(200) });
export type CancelOrderBody = z.infer<typeof CancelOrderBody>;

/** One step in an order's life: what, when, and who (a staff member's id, "customer" or "migration"). */
export const StatusChange = z.object({ status: OrderStatus, at: IsoDate, by: z.string() });
export type StatusChange = z.infer<typeof StatusChange>;

export const Order = z.object({
    _id: z.string(),
    table: z.string(),
    status: OrderStatus,
    statusHistory: z.array(StatusChange).optional(),
    cancelReason: z.string().optional(),
    orderedItems: z.array(OrderLine),
    /** VM-28: the customer's note for the whole order */
    note: z.string().optional(),
    resId: z.string().optional(),
    /** VM-23: the bill it was placed on (orders from before VM-23 have none) */
    billId: z.string().optional(),
    createdAt: IsoDate,
    orderedAt: IsoDate.optional(),
});
export type Order = z.infer<typeof Order>;

/** VM-31: one line of a bill: the same dish at the same price, merged across the bill's orders. */
export const BillLine = z.object({ _id: z.string(), name: z.string(), priceCents: Cents, quantity: z.number().int(), totalCents: Cents });
export type BillLine = z.infer<typeof BillLine>;

/** VM-30: what a customer can ask for from the menu: the bill, or a staff member. */
export const TableRequestKind = z.enum(["bill", "staff"], "Must be bill or staff");
export type TableRequestKind = z.infer<typeof TableRequestKind>;
export const TableRequestBody = z.object({ kind: TableRequestKind });
export type TableRequestBody = z.infer<typeof TableRequestBody>;
/** Each button works at most once per 2 minutes per bill. */
export const REQUEST_EVERY_MS = 2 * 60_000;

/** A table's bill: the orders of one visit, open until the cashier marks it paid. */
export const Bill = z.object({
    _id: z.string(),
    table: z.string(),
    isPaid: z.boolean(),
    /** @deprecated CL-06: the same as isPaid, for clients not yet updated; gone in the next release. */
    isPayed: z.boolean().optional(),
    orders: z.array(Order),
    /** VM-31: worked out by the server, in cents; cancelled orders left out */
    lines: z.array(BillLine),
    subtotalCents: Cents,
    totalCents: Cents,
    /** VM-30: the customer asked for the bill, or called staff; cleared when paid or dismissed */
    billRequestedAt: IsoDate.optional(),
    staffCalledAt: IsoDate.optional(),
    resId: z.string().optional(),
    createdAt: IsoDate,
    updatedAt: IsoDate.optional(),
});
export type Bill = z.infer<typeof Bill>;

/** VM-23: GET /internal/orders/without-bill: orders the cashier would never charge. */
export const OrdersWithoutBill = z.object({
    from: IsoDate,
    to: IsoDate,
    count: z.number().int(),
    /** the oldest 100 */
    orders: z.array(z.object({ _id: z.string(), resId: z.string(), table: z.string(), billId: z.string().optional(), createdAt: IsoDate })),
});
export type OrdersWithoutBill = z.infer<typeof OrdersWithoutBill>;

export const KitchenHistoryPage = pageOf(Order, "orders");
export type KitchenHistoryPage = { orders: Order[]; page: number; limit: number; total: number; pages: number };
export const PaidBillsPage = pageOf(Bill, "bills");
export type PaidBillsPage = { bills: Bill[]; page: number; limit: number; total: number; pages: number };

/** What a customer sees after ordering (VM-07). */
export const TableOrderView = z.object({
    _id: z.string(),
    number: z.string(),
    status: OrderStatus,
    cancelReason: z.string().optional(),
    /** VM-28 */
    note: z.string().optional(),
    table: z.string(),
    placedAt: IsoDate,
    lines: z.array(
        z.object({
            name: z.string(),
            priceCents: Cents,
            quantity: z.number(),
            totalCents: Cents,
            note: z.string().optional(),
            /** @deprecated CL-07: in dollars, for pages opened before the deploy; gone in the next release. */
            price: z.number().optional(),
            /** @deprecated CL-07: as above. */
            total: z.number().optional(),
        }),
    ),
    totalCents: Cents,
    /** @deprecated CL-07: in dollars, for pages opened before the deploy; gone in the next release. */
    total: z.number().optional(),
});
export type TableOrderView = z.infer<typeof TableOrderView>;
export const TableBill = z.object({
    table: z.string(),
    orders: z.array(TableOrderView),
    /** VM-31: the same lines and totals the cashier sees */
    lines: z.array(BillLine),
    subtotalCents: Cents,
    totalCents: Cents,
    /** @deprecated CL-07: in dollars, for pages opened before the deploy; gone in the next release. */
    total: z.number().optional(),
});
export type TableBill = z.infer<typeof TableBill>;

/** VM-09: an optional period for the dashboards, as ?from=&to= (ISO dates; `to` itself is not included). */
const QueryDate = z
    .string("Must be a date")
    .refine((s) => !Number.isNaN(Date.parse(s)), "Must be a date")
    .transform((s) => new Date(s));
export const DateRangeQuery = z
    .object({ from: QueryDate.optional(), to: QueryDate.optional() })
    .refine((r) => !r.from || !r.to || r.from <= r.to, { path: ["to"], message: "Must be after from" });
export type DateRangeQuery = z.infer<typeof DateRangeQuery>;

/** The period the numbers cover, as asked; null means no limit on that side. */
const Period = { from: IsoDate.nullable(), to: IsoDate.nullable() };

/** A restaurant's dashboard (VM-09: the counts are named xCount; was numOfX). */
export const Overview = z.object({
    tableCount: z.number(),
    activeTableCount: z.number(),
    itemCount: z.number(),
    /** orders placed in the period, cancelled ones left out */
    orderCount: z.number(),
    /** open bills now, whatever the period */
    unpaidBillCount: z.number(),
    /** bills paid in the period */
    paymentCount: z.number(),
    /** CL-07: in cents: the lines on the bills paid in the period, cancelled orders left out */
    revenueCents: Cents,
    ...Period,
});
export type Overview = z.infer<typeof Overview>;

/** Each of an owner's restaurants with its numbers. */
export const OwnerRestaurantOverview = Overview.extend({ resId: z.string(), resName: z.string() });
export type OwnerRestaurantOverview = z.infer<typeof OwnerRestaurantOverview>;

/** A dish by its id, with the name it had most recently. */
export const TopSeller = z.object({ _id: z.string(), name: z.string(), quantity: z.number() });
export type TopSeller = z.infer<typeof TopSeller>;

/** Totals across all of an owner's restaurants. */
export const OwnerOverview = z.object({
    unpaidBillCount: z.number(),
    itemCount: z.number(),
    orderCount: z.number(),
    paymentCount: z.number(),
    revenueCents: Cents,
    /** items on the bills paid in the period */
    itemsSoldCount: z.number(),
    /** items per order, over the same paid orders */
    avgItemsPerOrder: z.number(),
    topSellingItems: z.array(TopSeller),
    ...Period,
});
export type OwnerOverview = z.infer<typeof OwnerOverview>;
