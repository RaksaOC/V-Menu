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
    resId: string;
    orderedAt: Date;
    createdAt: Date;
}

/** Every MongoDB query on orders (CL-04). The services only see this interface. */
export interface OrdersRepo {
    create(order: { table: string; orderedItems: OrderLine[]; resId: string }): Promise<OrderRecord>;
    /** orders that count: everything but cancelled (VM-27) */
    countFor(resIds: string[]): Promise<number>;
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
    listServed(resIds: string[]): Promise<OrderRecord[]>;
    /** null when there's no such order in this restaurant */
    get(resId: string, id: string): Promise<OrderRecord | null>;
    /** B10: when the oldest order still pending, in any restaurant, was placed; null when none is */
    oldestPendingAt(): Promise<Date | null>;
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
    countFor: (resIds) => Order.countDocuments({ ...inRestaurants(resIds), status: mongoose.trusted({ $ne: "cancelled" }) }),
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
    listServed: (resIds) => Order.find({ ...inRestaurants(resIds), status: "served" }).lean<OrderRecord[]>(),
    get: (resId, id) => Order.findOne({ _id: id, resId }).lean<OrderRecord>(),
    async oldestPendingAt() {
        const oldest = await Order.findOne({ status: "pending" }, { orderedAt: 1 }).sort({ orderedAt: 1 }).lean<{ orderedAt: Date }>();
        return oldest?.orderedAt ?? null;
    },
};
