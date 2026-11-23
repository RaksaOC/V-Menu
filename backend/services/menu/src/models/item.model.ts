import mongoose from "mongoose";

// A dish on a restaurant's menu.
const itemSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        price: { type: Number, required: true, min: 0 },
        image: { type: String, required: true, maxlength: 2000 },
        isEnabled: { type: Boolean, default: true },
        resId: { type: String, required: true, index: true },
        categoryId: { type: String, default: null }, // VM-25: null means "Other"
        description: { type: String, trim: true, maxlength: 300, default: "" }, // VM-26
        tags: { type: [String], default: [] }, // VM-26: from DISH_TAGS in @vmenu/contracts
    },
    { timestamps: true },
);
itemSchema.index({ resId: 1, categoryId: 1 });

export const Item = mongoose.model("Item", itemSchema, "items");
