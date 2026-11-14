import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema(
    {
        table: { type: String },
        orderedItems: [],
        orderedAt: { type: Date, default: Date.now },
        isDone: { type: Boolean, default: false },
        resId: { type: String, required: true },
    },
    {
        timestamps: true,
    }
);

export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema, 'orders');
