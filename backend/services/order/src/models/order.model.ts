import mongoose from "mongoose";
import { ORDER_STATUSES } from "@vmenu/contracts";

// One customer order. Each line keeps a copy of the dish as it was when ordered (name, price,
// image), so a later menu change never rewrites an old bill.
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
        // VM-27: pending → preparing → ready → served, or cancelled by the cashier (was isDone)
        status: { type: String, enum: ORDER_STATUSES, default: "pending" },
        statusHistory: [{ _id: false, status: { type: String, enum: ORDER_STATUSES }, at: Date, by: String }],
        cancelReason: { type: String, maxlength: 200 },
        resId: { type: String, required: true, index: true },
    },
    { timestamps: true },
);

// VM-10: the kitchen's queue (oldest first) and its history (newest first), by status (VM-27).
orderSchema.index({ resId: 1, status: 1, createdAt: 1 });

export const Order = mongoose.model("Order", orderSchema, "orders");
