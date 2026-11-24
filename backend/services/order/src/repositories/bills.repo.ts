import mongoose from "mongoose";
import { Bill } from "../models/bill.model.js";
import type { OrderRecord } from "./orders.repo.js";

export interface BillRecord {
    _id: string;
    table: string;
    orders: OrderRecord[];
    isPaid: boolean;
    resId: string;
    createdAt: Date;
    /** when it last changed: for a paid bill, when it was paid */
    updatedAt?: Date;
}

/** Thrown when a change would give a table a second open bill (VM-08). */
export class OpenBillExists extends Error {
    constructor() {
        super("This table already has an open bill");
    }
}

const isDuplicateKey = (err: unknown) => (err as { code?: number })?.code === 11000;

/** Every MongoDB query on bills (CL-04). */
export interface BillsRepo {
    /** Adds the order to the table's open bill, opening one if there is none. */
    addToOpenBill(resId: string, table: string, orderId: string): Promise<void>;
    countFor(resIds: string[], isPaid: boolean): Promise<number>;
    /** newest first, with the orders filled in */
    /** open bills with their orders, newest first (VM-11) */
    listOpen(resId: string): Promise<BillRecord[]>;
    /** paid bills with their orders, most recently paid first, one page, and the total (VM-11) */
    pagePaid(resId: string, skip: number, limit: number): Promise<{ bills: BillRecord[]; total: number }>;
    get(resId: string, id: string): Promise<BillRecord | null>;
    /** the table's open bill with its orders, or null */
    findOpen(resId: string, table: string): Promise<BillRecord | null>;
    hasOtherOpenBill(resId: string, table: string, exceptId: string): Promise<boolean>;
    /** null when there's no such bill in this restaurant; throws OpenBillExists */
    setPaid(resId: string, id: string, isPaid: boolean): Promise<BillRecord | null>;
}

export const mongoBillsRepo: BillsRepo = {
    async addToOpenBill(resId, table, orderId) {
        const join = () =>
            Bill.findOneAndUpdate(
                { table, resId, isPaid: false },
                { $push: { orders: orderId }, $setOnInsert: { table, resId, isPaid: false } },
                { upsert: true },
            );
        try {
            await join();
        } catch (err) {
            // VM-08: two orders arrived together and both tried to open the bill. The unique index
            // let one win; the other now finds that bill and joins it.
            if (!isDuplicateKey(err)) throw err;
            await join();
        }
    },
    findOpen: (resId, table) => Bill.findOne({ resId, table, isPaid: false }).populate("orders").lean<BillRecord>(),
    get: (resId, id) => Bill.findOne({ _id: id, resId }).populate("orders").lean<BillRecord>(),
    async hasOtherOpenBill(resId, table, exceptId) {
        // exceptId is a bill id this service already looked up, not raw input
        return Boolean(await Bill.exists({ resId, table, isPaid: false, _id: mongoose.trusted({ $ne: exceptId }) }));
    },
    countFor: (resIds, isPaid) => Bill.countDocuments({ resId: mongoose.trusted({ $in: resIds }), isPaid }),
    listOpen: (resId) => Bill.find({ resId, isPaid: false }).sort({ createdAt: -1 }).populate("orders").lean<BillRecord[]>(),
    async pagePaid(resId, skip, limit) {
        const [bills, total] = await Promise.all([
            Bill.find({ resId, isPaid: true }).sort({ updatedAt: -1 }).skip(skip).limit(limit).populate("orders").lean<BillRecord[]>(),
            Bill.countDocuments({ resId, isPaid: true }),
        ]);
        return { bills, total };
    },
    async setPaid(resId, id, isPaid) {
        try {
            return await Bill.findOneAndUpdate({ _id: id, resId }, { isPaid }, { new: true }).populate("orders").lean<BillRecord>();
        } catch (err) {
            if (isDuplicateKey(err)) throw new OpenBillExists(); // re-opened while another bill opened
            throw err;
        }
    },
};
