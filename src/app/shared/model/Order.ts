import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
    table: {type: String,},
    orderedItems: [],
    orderedAt: { type: Date, default: Date.now() },
    isDone: { type: Boolean, default: false },
    resId: { type: String, required: true },
})

export const Order = mongoose.model('Order', OrderSchema) || mongoose.models.Order;