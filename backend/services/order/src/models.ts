import mongoose from "mongoose";

// order-service owns orders and the per-table bills that group them.

// Each line keeps a copy of the dish as it was when ordered (name, price, image), so a later
// menu change never rewrites an old bill.
const orderSchema = new mongoose.Schema(
    {
        table: { type: String, required: true },
        orderedItems: [
            {
                _id: false,
                item: { _id: String, name: String, price: Number, image: String, isEnabled: Boolean },
                quantity: { type: Number, required: true, min: 1 },
            },
        ],
        orderedAt: { type: Date, default: Date.now },
        isDone: { type: Boolean, default: false },
        resId: { type: String, required: true, index: true },
    },
    { timestamps: true },
);

// One open bill per table until the cashier marks it paid.
const tableOrderSchema = new mongoose.Schema(
    {
        table: { type: String, required: true },
        orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
        isPayed: { type: Boolean, default: false },
        resId: { type: String, required: true, index: true },
    },
    { timestamps: true },
);

export const Order = mongoose.model("Order", orderSchema, "orders");
export const TableOrder = mongoose.model("TableOrder", tableOrderSchema, "table_orders");
