import mongoose from 'mongoose';

const ItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    isEnabled: { type: Boolean, default: true },
    resId: { type: String, required: true },
})

export const Item = mongoose.models.Item || mongoose.model("Item", ItemSchema);

