import mongoose from "mongoose";
import { ACTIVE_STATUSES, type OrderStatus } from "@vmenu/contracts";
import type { OrderLine } from "../clients/index.js";
import { Order } from "../models/order.model.js";

export interface StatusChangeRecord {
    status: OrderStatus;
    at: Date;
    by: string;
}

export interface OrderRecord {
    _id: string;
    table: string;
    orderedItems: OrderLine[];
    status: OrderStatus;
    statusHistory: StatusChangeRecord[];
    cancelReason?: string;
    /** VM-28 */
    note?: string;
    resId: string;
    /** VM-23: orders from before it have none */
    billId?: string;
    orderedAt: Date;
    createdAt: Date;
}

/** VM-09: a period for the dashboards: from is included, to is not. */
export interface DateRange {
    from?: Date;
    to?: Date;
}

/** { field: { $gte: from, $lt: to } } for the sides that are set, or nothing. */
export function inRange(field: string, { from, to }: DateRange = {}) {
    if (!from && !to) return {};
    return { [field]: mongoose.trusted({ ...(from && { $gte: from }), ...(to && { $lt: to }) }) }; // dates parsed by DateRangeQuery
}

/** VM-23: an order that's on no bill, as the internal check reports it. */
export interface OrderWithoutBill {
    _id: string;
    resId: string;
    table: string;
    billId?: string;
    createdAt: Date;
}

/** Every MongoDB query on orders (CL-04). The services only see this interface. */
export interface OrdersRepo {
    create(order: { table: string; orderedItems: OrderLine[]; resId: string; billId: string; note?: string }): Promise<OrderRecord>;
    /** VM-23: the bill it was on was paid first, so it moves to the table's new one. */
    setBill(resId: string, id: string, billId: string): Promise<void>;
    /** VM-23: takes back an order that could not be put on a bill. */
    remove(resId: string, id: string): Promise<void>;
    /** VM-23: orders placed in the range that no bill holds, oldest first; cancelled ones aren't charged, so they're left out. */
    listWithoutBill(range: { from: Date; to: Date }, limit: number): Promise<{ orders: OrderWithoutBill[]; total: number }>;
    /** orders that count: everything but cancelled (VM-27), placed in the range when one is given (VM-09) */
    countFor(resIds: string[], range?: DateRange): Promise<number>;
    /** pending, preparing and ready, oldest first (VM-10, VM-27) */
    listActive(resId: string): Promise<OrderRecord[]>;
    /** served and cancelled orders, newest first, one page, and how many in all */
    pageFinished(resId: string, skip: number, limit: number): Promise<{ orders: OrderRecord[]; total: number }>;
    /** Moves the order from `from` to `to`, recording the step, only if it is still `from`
     *  (so two screens can't both move it). null when it isn't, or there's no such order. */
    setStatus(
        resId: string,
        id: string,
        from: OrderStatus,
        to: OrderStatus,
        change: { at: Date; by: string },
        extra?: { cancelReason?: string },
    ): Promise<OrderRecord | null>;
    /** null when there's no such order in this restaurant */
    get(resId: string, id: string): Promise<OrderRecord | null>;
    /** B10: when the oldest order still pending, placed since `since`, in any restaurant, was placed */
    oldestPendingAt(since: Date): Promise<Date | null>;
}

// resIds and statuses come from our own code, never from a request body, so $in is safe here.
const inRestaurants = (resIds: string[]) => ({ resId: mongoose.trusted({ $in: resIds }) });
const FINISHED: OrderStatus[] = ["served", "cancelled"];

export const mongoOrdersRepo: OrdersRepo = {
    async create(order) {
        const at = new Date();
        const created = await Order.create({ ...order, status: "pending", statusHistory: [{ status: "pending", at, by: "customer" }] });
        return created.toObject() as unknown as OrderRecord;
    },
    async setBill(resId, id, billId) {
        await Order.updateOne({ _id: id, resId }, { billId });
    },
    async remove(resId, id) {
        await Order.deleteOne({ _id: id, resId });
    },
    async listWithoutBill({ from, to }, limit) {
        const [result] = await Order.aggregate<{ rows: OrderWithoutBill[]; total: { n: number }[] }>([
            { $match: { createdAt: { $gte: from, $lt: to }, status: { $ne: "cancelled" } } },
            { $project: { resId: 1, table: 1, billId: 1, createdAt: 1 } },
            { $lookup: { from: "table_orders", localField: "_id", foreignField: "orders", as: "bills" } },
            { $match: { bills: { $size: 0 } } },
            { $project: { bills: 0 } },
            { $sort: { createdAt: 1 } },
            { $facet: { rows: [{ $limit: limit }], total: [{ $count: "n" }] } },
        ]);
        return { orders: result.rows, total: result.total[0]?.n ?? 0 };
    },
    countFor: (resIds, range) =>
        Order.countDocuments({ ...inRestaurants(resIds), status: mongoose.trusted({ $ne: "cancelled" }), ...inRange("createdAt", range) }),
    listActive: (resId) =>
        Order.find({ resId, status: mongoose.trusted({ $in: ACTIVE_STATUSES }) })
            .sort({ createdAt: 1 })
            .lean<OrderRecord[]>(),
    async pageFinished(resId, skip, limit) {
        const where = { resId, status: mongoose.trusted({ $in: FINISHED }) };
        const [orders, total] = await Promise.all([
            Order.find(where).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<OrderRecord[]>(),
            Order.countDocuments(where),
        ]);
        return { orders, total };
    },
    setStatus: (resId, id, from, to, change, extra = {}) =>
        Order.findOneAndUpdate(
            { _id: id, resId, status: from },
            { $set: { status: to, ...extra }, $push: { statusHistory: { status: to, ...change } } },
            { new: true },
        ).lean<OrderRecord>(),
    get: (resId, id) => Order.findOne({ _id: id, resId }).lean<OrderRecord>(),
    async oldestPendingAt(since) {
        const oldest = await Order.findOne({ status: "pending", orderedAt: mongoose.trusted({ $gte: since }) }, { orderedAt: 1 })
            .sort({ orderedAt: 1 })
            .maxTimeMS(2000) // read on every /metrics scrape, so it must never be slow
            .lean<{ orderedAt: Date }>();
        return oldest?.orderedAt ?? null;
    },
};
