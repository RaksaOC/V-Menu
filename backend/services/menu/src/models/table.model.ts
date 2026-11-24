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
// VM-16: one name per table in a restaurant. The database enforces it, so two requests at the
// same moment can't both create table "5"; the loser gets a duplicate-key error (11000).
tableSchema.index({ resId: 1, name: 1 }, { unique: true });

export const Table = mongoose.model("Table", tableSchema, "tables");
