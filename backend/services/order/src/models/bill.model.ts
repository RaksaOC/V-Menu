import mongoose from "mongoose";

// A table's bill: the orders placed at one table, open until the cashier marks it paid.
// (Stored as "table_orders", the collection's name since the start.)
const billSchema = new mongoose.Schema(
    {
        table: { type: String, required: true },
        orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
        isPayed: { type: Boolean, default: false },
        resId: { type: String, required: true, index: true },
    },
    { timestamps: true },
);

export const Bill = mongoose.model("TableOrder", billSchema, "table_orders");
