import mongoose from "mongoose";
import { newQrToken } from "../qr-token.js";

// A table customers order from (its QR code opens /<slug>/t/<qrToken>, SEC-04).
const tableSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 40 },
        isEnabled: { type: Boolean, default: true },
        resId: { type: String, required: true, index: true },
        // SEC-04: sparse, because tables from before it get theirs at startup (db.ts)
        qrToken: { type: String, default: newQrToken, index: { unique: true, sparse: true } },
    },
    { timestamps: true },
);
// VM-16: one name per table in a restaurant. The database enforces it, so two requests at the
// same moment can't both create table "5"; the loser gets a duplicate-key error (11000).
tableSchema.index({ resId: 1, name: 1 }, { unique: true });

export const Table = mongoose.model("Table", tableSchema, "tables");
