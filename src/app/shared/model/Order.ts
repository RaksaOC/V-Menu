import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
    orderedItems: [],
    orderedAt: { type: Date, default: Date.now() },
    isDone: { type: Boolean, default: false }
})

export const Order = mongoose.model('Order', OrderSchema);