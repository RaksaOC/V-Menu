import mongoose from "mongoose";

// A membership: one role of one person at one restaurant (an owner has all three). CL-06: it was
// called Tenant; the collection keeps its old name, "tenants", so no data moves.
const membershipSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        tenantId: { type: String, default: null, index: true }, // Firebase uid; null until an invite is accepted (VM-12)
        email: { type: String, required: true, lowercase: true, trim: true, index: true },
        role: { type: String, required: true, enum: ["owner", "cashier", "chef"] },
        resId: { type: String, required: true, index: true },
    },
    { timestamps: true },
);

export const Membership = mongoose.model("Membership", membershipSchema, "tenants");
