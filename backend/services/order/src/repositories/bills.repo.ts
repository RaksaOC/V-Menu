import mongoose from "mongoose";
import { Bill } from "../models/bill.model.js";
import type { OrderRecord } from "./orders.repo.js";

export interface BillRecord {
    _id: string;
    table: string;
    orders: OrderRecord[];
    isPayed: boolean;
    resId: string;
    createdAt: Date;
}

/** Every MongoDB query on bills (CL-04). */
export interface BillsRepo {
    /** Adds the order to the table's open bill, opening one if there is none. */
    addToOpenBill(resId: string, table: string, orderId: string): Promise<void>;
    countFor(resIds: string[], isPayed: boolean): Promise<number>;
    /** newest first, with the orders filled in */
    listWithOrders(resId: string): Promise<BillRecord[]>;
    /** null when there's no such bill in this restaurant */
    setPaid(resId: string, id: string, isPayed: boolean): Promise<BillRecord | null>;
}

export const mongoBillsRepo: BillsRepo = {
    async addToOpenBill(resId, table, orderId) {
        await Bill.findOneAndUpdate(
            { table, resId, isPayed: false },
            { $push: { orders: orderId }, $setOnInsert: { table, resId, isPayed: false } },
            { upsert: true },
        );
    },
    countFor: (resIds, isPayed) => Bill.countDocuments({ resId: mongoose.trusted({ $in: resIds }), isPayed }),
    listWithOrders: (resId) => Bill.find({ resId }).sort({ createdAt: -1 }).populate("orders").lean<BillRecord[]>(),
    setPaid: (resId, id, isPayed) =>
        Bill.findOneAndUpdate({ _id: id, resId }, { isPayed }, { new: true }).populate("orders").lean<BillRecord>(),
};
