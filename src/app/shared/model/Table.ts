import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        isEnabled: { type: Boolean, default: true },
        resId: { type: String, required: true },
    },
    {
        timestamps: true,
    }
);

export const Table = mongoose.models.Table || mongoose.model("Table", tableSchema);
