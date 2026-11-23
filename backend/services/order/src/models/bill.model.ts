import mongoose from "mongoose";

// A table's bill: the orders placed at one table, open until the cashier marks it paid.
// (Stored as "table_orders", the collection's name since the start.)
const billSchema = new mongoose.Schema(
    {
        table: { type: String, required: true },
        orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
        isPaid: { type: Boolean, default: false },
        resId: { type: String, required: true, index: true },
    },
    { timestamps: true },
);

// VM-08: at most one open (unpaid) bill per table, enforced by MongoDB itself.
billSchema.index({ resId: 1, table: 1 }, { unique: true, partialFilterExpression: { isPaid: false }, name: "one_open_bill_per_table" });

// VM-11: the cashier's open bills, and the paid ones, most recently paid first.
billSchema.index({ resId: 1, isPaid: 1, updatedAt: -1 });

export const Bill = mongoose.model("TableOrder", billSchema, "table_orders");
