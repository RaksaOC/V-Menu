import mongoose from "mongoose";

// A dish on a restaurant's menu.
const itemSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        price: { type: Number, required: true, min: 0 },
        image: { type: String, required: true, maxlength: 2000 },
        isEnabled: { type: Boolean, default: true },
        resId: { type: String, required: true, index: true },
    },
    { timestamps: true },
);

export const Item = mongoose.model("Item", itemSchema, "items");
