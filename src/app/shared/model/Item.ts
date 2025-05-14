import mongoose from 'mongoose';

const ItemSchema = new mongoose.Schema({
    _id: {type: String, required: true},
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    isEnabled: { type: Boolean, default: true }
})

export const Item = mongoose.model('Item', ItemSchema);

