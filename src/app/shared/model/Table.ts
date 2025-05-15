import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    isEnabled: {
        type: Boolean,
        default: true
    }
});

export const Table = mongoose.models.Table || mongoose.model("Table", tableSchema);