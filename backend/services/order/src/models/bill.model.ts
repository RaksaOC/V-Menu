import mongoose from "mongoose";

// A table's bill: the orders placed at one table, open until the cashier marks it paid.
// (Stored as "table_orders", the collection's name since the start.)
const billSchema = new mongoose.Schema(
    {
        table: { type: String, required: true },
        orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
        isPaid: { type: Boolean, default: false },
        // CL-06: the old name, written with isPaid for one release so the previous version still
        // works after a rollback. Remove it (and its writes in bills.repo.ts and the back-fill in
        // migrations/is-paid.ts) in the release after this one is in production.
        isPayed: Boolean,
        resId: { type: String, required: true, index: true },
        // VM-30: the customer pressed "Request bill" or "Call staff". Cleared when paid or dismissed.
        billRequestedAt: Date,
        staffCalledAt: Date,
        // the last press of each button, kept after a dismiss, for the once-per-2-minutes limit
        requestLog: { bill: Date, staff: Date },
    },
    { timestamps: true },
);

// VM-23: finds the bill an order is on. Declared first: the unique index below can fail to build.
billSchema.index({ orders: 1 });

// VM-08: at most one open (unpaid) bill per table, enforced by MongoDB itself.
billSchema.index({ resId: 1, table: 1 }, { unique: true, partialFilterExpression: { isPaid: false }, name: "one_open_bill_per_table" });

// VM-11: the cashier's open bills, and the paid ones, most recently paid first.
billSchema.index({ resId: 1, isPaid: 1, updatedAt: -1 });

export const Bill = mongoose.model("TableOrder", billSchema, "table_orders");
