import mongoose from "mongoose";

// VM-25: a section of a restaurant's menu ("Mains", "Drinks"), in the owner's order.
const categorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 40 },
        sortOrder: { type: Number, required: true, default: 0 },
        resId: { type: String, required: true },
    },
    { timestamps: true },
);
categorySchema.index({ resId: 1, sortOrder: 1 });

export const Category = mongoose.model("Category", categorySchema, "categories");
