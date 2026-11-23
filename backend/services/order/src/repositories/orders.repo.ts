import mongoose from "mongoose";
import type { OrderLine } from "../clients/index.js";
import { Order } from "../models/order.model.js";

export interface OrderRecord {
    _id: string;
    table: string;
    orderedItems: OrderLine[];
    isDone: boolean;
    resId: string;
    orderedAt: Date;
    createdAt: Date;
}

/** Every MongoDB query on orders (CL-04). The services only see this interface. */
export interface OrdersRepo {
    create(order: { table: string; orderedItems: OrderLine[]; resId: string }): Promise<OrderRecord>;
    countFor(resIds: string[], where?: { isDone?: boolean }): Promise<number>;
    /** oldest first */
    listForKitchen(resId: string): Promise<OrderRecord[]>;
    /** null when there's no such order in this restaurant */
    markDone(resId: string, id: string): Promise<OrderRecord | null>;
    listDone(resIds: string[]): Promise<OrderRecord[]>;
    /** null when there's no such order in this restaurant */
    get(resId: string, id: string): Promise<OrderRecord | null>;
}

// resIds come from our own services, never from a request body, so $in is safe here.
const inRestaurants = (resIds: string[]) => ({ resId: mongoose.trusted({ $in: resIds }) });

export const mongoOrdersRepo: OrdersRepo = {
    async create(order) {
        return (await Order.create(order)).toObject() as unknown as OrderRecord;
    },
    countFor: (resIds, where = {}) => Order.countDocuments({ ...inRestaurants(resIds), ...where }),
    listForKitchen: (resId) => Order.find({ resId }).sort({ createdAt: 1 }).lean<OrderRecord[]>(),
    markDone: (resId, id) => Order.findOneAndUpdate({ _id: id, resId }, { isDone: true }, { new: true }).lean<OrderRecord>(),
    get: (resId, id) => Order.findOne({ _id: id, resId }).lean<OrderRecord>(),
    listDone: (resIds) => Order.find({ ...inRestaurants(resIds), isDone: true }).lean<OrderRecord[]>(),
};
