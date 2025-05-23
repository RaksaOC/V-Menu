import mongoose from "mongoose";

const TenantSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        tenantId: { type: String, required: true },
        email: { type: String, required: true },
        role: { type: String, required: true },
        resId: { type: String, required: true },
    },
    {
        timestamps: true,
    }
);

export const Tenant = mongoose.models.Tenant || mongoose.model("Tenant", TenantSchema, "tenants");
