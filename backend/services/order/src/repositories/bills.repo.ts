import mongoose from "mongoose";
import { Bill } from "../models/bill.model.js";
import { inRange, type DateRange, type OrderRecord } from "./orders.repo.js";

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

/** VM-23: a bill is opened just before its first order is saved. Until then the cashier has nothing to charge. */
const HAS_ORDERS = { "orders.0": mongoose.trusted({ $exists: true }) };

const isDuplicateKey = (err: unknown) => (err as { code?: number })?.code === 11000;

/** Every MongoDB query on bills (CL-04). */
export interface BillsRepo {
    /** VM-23: the id of the table's open bill, opening one if there is none. */
    openBillFor(resId: string, table: string): Promise<string>;
    /** VM-23: puts the order on the bill, if it's still open (false when it's been paid). Safe to repeat. */
    attachOrder(billId: string, orderId: string): Promise<boolean>;
    /** VM-23: takes the order off any bill of this restaurant. */
    detachOrder(resId: string, orderId: string): Promise<void>;
    /** VM-23: deletes the table's open bill if no order ever reached it. */
    removeEmptyOpen(resId: string, table: string): Promise<void>;
    /** open bills with at least one order, now, across these restaurants */
    countOpen(resIds: string[]): Promise<number>;
    /** VM-09: the bills paid in the range (by when they were paid), with their orders' lines and statuses */
    listPaid(resIds: string[], range?: DateRange): Promise<BillRecord[]>;
    /** open bills that have orders, with those orders, newest first (VM-11, VM-23) */
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
    async openBillFor(resId, table) {
        const open = () =>
            Bill.findOneAndUpdate(
                { table, resId, isPaid: false },
                { $setOnInsert: { table, resId, isPaid: false } },
                { upsert: true, new: true, projection: { _id: 1 } },
            ).lean();
        try {
            return String((await open())!._id);
        } catch (err) {
            // VM-08: two orders arrived together and both tried to open the bill. The unique index
            // let one win; the other now finds that bill.
            if (!isDuplicateKey(err)) throw err;
            return String((await open())!._id);
        }
    },
    async attachOrder(billId, orderId) {
        const { matchedCount } = await Bill.updateOne({ _id: billId, isPaid: false }, { $addToSet: { orders: orderId } });
        return matchedCount > 0;
    },
    async detachOrder(resId, orderId) {
        // timestamps off: a paid bill's updatedAt is when it was paid (VM-09)
        await Bill.updateMany({ resId, orders: orderId }, { $pull: { orders: orderId } }, { timestamps: false });
    },
    async removeEmptyOpen(resId, table) {
        await Bill.deleteOne({ resId, table, isPaid: false, orders: mongoose.trusted({ $size: 0 }) });
    },
    findOpen: (resId, table) => Bill.findOne({ resId, table, isPaid: false }).populate("orders").lean<BillRecord>(),
    get: (resId, id) => Bill.findOne({ _id: id, resId }).populate("orders").lean<BillRecord>(),
    async hasOtherOpenBill(resId, table, exceptId) {
        // exceptId is a bill id this service already looked up, not raw input
        return Boolean(await Bill.exists({ resId, table, isPaid: false, _id: mongoose.trusted({ $ne: exceptId }) }));
    },
    countOpen: (resIds) => Bill.countDocuments({ resId: mongoose.trusted({ $in: resIds }), isPaid: false, ...HAS_ORDERS }),
    listPaid: (resIds, range) =>
        // a paid bill's updatedAt is when it was paid (it doesn't change after that)
        Bill.find({ resId: mongoose.trusted({ $in: resIds }), isPaid: true, ...inRange("updatedAt", range) })
            .populate({ path: "orders", select: "orderedItems status createdAt" })
            .lean<BillRecord[]>(),
    listOpen: (resId) =>
        Bill.find({ resId, isPaid: false, ...HAS_ORDERS })
            .sort({ createdAt: -1 })
            .populate("orders")
            .lean<BillRecord[]>(),
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
