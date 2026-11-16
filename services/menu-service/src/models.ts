import mongoose from "mongoose";

// menu-service owns menu items and tables.

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

const tableSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 40 },
        isEnabled: { type: Boolean, default: true },
        resId: { type: String, required: true, index: true },
    },
    { timestamps: true },
);

export const Item = mongoose.model("Item", itemSchema, "items");
export const Table = mongoose.model("Table", tableSchema, "tables");
