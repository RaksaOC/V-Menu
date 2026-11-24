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
                // CL-07: priceCents is the price; `price` (dollars) stays for one release, for a rollback
                item: { _id: String, name: String, priceCents: Number, price: Number, image: String, isEnabled: Boolean },
                quantity: { type: Number, required: true, min: 1 },
                note: { type: String, maxlength: 100 }, // VM-28: "no chilli"
            },
        ],
        note: { type: String, maxlength: 200 }, // VM-28: the customer's note for the whole order
        orderedAt: { type: Date, default: Date.now },
        // VM-27: pending → preparing → ready → served, or cancelled by the cashier (was isDone)
        status: { type: String, enum: ORDER_STATUSES, default: "pending" },
        // VM-27: the old "done" flag (the kitchen finished it: ready or served), written with status
        // for one release so the previous version still works after a rollback. Remove it (and its
        // writes in orders.repo.ts and the back-fill in migrations/order-status.ts) in the release after.
        isDone: Boolean,
        statusHistory: [{ _id: false, status: { type: String, enum: ORDER_STATUSES }, at: Date, by: String }],
        cancelReason: { type: String, maxlength: 200 },
        resId: { type: String, required: true, index: true },
        // VM-23: the bill it was placed on. Orders from before VM-23 have none.
        billId: { type: mongoose.Schema.Types.ObjectId, ref: "TableOrder" },
    },
    { timestamps: true },
);

// VM-10: the kitchen's queue (oldest first) and its history (newest first), by status (VM-27).
orderSchema.index({ resId: 1, status: 1, createdAt: 1 });
// B10: the oldest pending order across restaurants, read on every /metrics scrape.
orderSchema.index({ status: 1, orderedAt: 1 });

export const Order = mongoose.model("Order", orderSchema, "orders");
