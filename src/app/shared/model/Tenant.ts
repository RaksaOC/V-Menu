import mongoose from "mongoose";

const TenantSchema = new mongoose.Schema({
    // name: {}
    tenantId: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    }
})

export const Tenant = mongoose.model("Tenant", TenantSchema, "tenants");