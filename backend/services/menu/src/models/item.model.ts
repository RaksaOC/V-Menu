import mongoose from "mongoose";

// A dish on a restaurant's menu.
const itemSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        // CL-07: the price, in whole cents
        priceCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
        // The same price in dollars, kept in step for one release: the previous version reads it after a rollback.
        price: { type: Number, min: 0 },
        image: { type: String, required: true, maxlength: 2000 },
        isEnabled: { type: Boolean, default: true },
        resId: { type: String, required: true, index: true },
        categoryId: { type: String, default: null }, // VM-25: null means "Other"
    },
    { timestamps: true },
);
itemSchema.index({ resId: 1, categoryId: 1 });

export const Item = mongoose.model("Item", itemSchema, "items");
