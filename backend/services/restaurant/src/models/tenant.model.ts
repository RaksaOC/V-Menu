import mongoose from "mongoose";

// One role of one person at one restaurant (an owner has all three).
const tenantSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        tenantId: { type: String, required: true, index: true }, // Firebase uid
        email: { type: String, required: true, lowercase: true, trim: true, index: true },
        role: { type: String, required: true, enum: ["owner", "cashier", "chef"] },
        resId: { type: String, required: true, index: true },
    },
    { timestamps: true },
);

export const Tenant = mongoose.model("Tenant", tenantSchema, "tenants");
