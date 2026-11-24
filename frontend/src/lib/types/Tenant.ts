export interface TenantOutput {
    _id: string;
    name: string;
    tenantId: string;
    email: string,
    role: "owner" | "cashier" | "chef",
    resId: string,
    createdAt: Date,
    updatedAt: Date,
}

export interface TenantInput {
    email: string;
    tenantId: string;
    name: string;
    role: "cashier" | "chef" | "",
    password: string;
}