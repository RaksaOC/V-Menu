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
    countFor(resIds: string[], isPayed: boolean): Promise<number>;
    /** newest first, with the orders filled in */
    listWithOrders(resId: string): Promise<BillRecord[]>;
    get(resId: string, id: string): Promise<BillRecord | null>;
    /** the table's open bill with its orders, or null */
    findOpen(resId: string, table: string): Promise<BillRecord | null>;
    hasOtherOpenBill(resId: string, table: string, exceptId: string): Promise<boolean>;
    /** null when there's no such bill in this restaurant; throws OpenBillExists */
    setPaid(resId: string, id: string, isPayed: boolean): Promise<BillRecord | null>;
}

export const mongoBillsRepo: BillsRepo = {
    async addToOpenBill(resId, table, orderId) {
        const join = () =>
            Bill.findOneAndUpdate(
                { table, resId, isPayed: false },
                { $push: { orders: orderId }, $setOnInsert: { table, resId, isPayed: false } },
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
    findOpen: (resId, table) => Bill.findOne({ resId, table, isPayed: false }).populate("orders").lean<BillRecord>(),
    get: (resId, id) => Bill.findOne({ _id: id, resId }).populate("orders").lean<BillRecord>(),
    async hasOtherOpenBill(resId, table, exceptId) {
        // exceptId is a bill id this service already looked up, not raw input
        return Boolean(await Bill.exists({ resId, table, isPayed: false, _id: mongoose.trusted({ $ne: exceptId }) }));
    },
    countFor: (resIds, isPayed) => Bill.countDocuments({ resId: mongoose.trusted({ $in: resIds }), isPayed }),
    listWithOrders: (resId) => Bill.find({ resId }).sort({ createdAt: -1 }).populate("orders").lean<BillRecord[]>(),
    async setPaid(resId, id, isPayed) {
        try {
            return await Bill.findOneAndUpdate({ _id: id, resId }, { isPayed }, { new: true }).populate("orders").lean<BillRecord>();
        } catch (err) {
            if (isDuplicateKey(err)) throw new OpenBillExists(); // re-opened while another bill opened
            throw err;
        }
    },
};
