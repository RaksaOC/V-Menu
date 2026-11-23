import mongoose from "mongoose";

// A table customers order from (its QR code opens /<slug>/customer/<name>).
const tableSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 40 },
        isEnabled: { type: Boolean, default: true },
        resId: { type: String, required: true, index: true },
    },
    { timestamps: true },
);

export const Table = mongoose.model("Table", tableSchema, "tables");
