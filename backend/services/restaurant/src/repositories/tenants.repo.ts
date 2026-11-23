import mongoose from "mongoose";
import { Tenant } from "../models/tenant.model.js";

export type TenantRole = "owner" | "cashier" | "chef";
export interface TenantRecord {
    _id: string;
    name: string;
    tenantId: string;
    email: string;
    role: TenantRole;
    resId: string;
}
type NewTenant = Omit<TenantRecord, "_id">;

/** Every MongoDB query on tenants: who has which role where (CL-04). */
export interface TenantsRepo {
    /** has this account an owner role anywhere */
    isOwner(uid: string): Promise<boolean>;
    firstFor(uid: string): Promise<TenantRecord | null>;
    /** every role of this person, matched by account or by email */
    forPerson(uid: string, email: string): Promise<TenantRecord[]>;
    hasRole(resId: string, role: string, who: { uid: string; email: string }): Promise<boolean>;
    inRestaurants(resIds: string[]): Promise<TenantRecord[]>;
    createMany(list: NewTenant[]): Promise<TenantRecord[]>;
    get(resId: string, id: string): Promise<TenantRecord | null>;
    /** null when there's no such tenant in this restaurant */
    update(resId: string, id: string, fields: Partial<Pick<TenantRecord, "name" | "email" | "role">>): Promise<TenantRecord | null>;
    remove(resId: string, id: string): Promise<TenantRecord | null>;
}

export const mongoTenantsRepo: TenantsRepo = {
    async isOwner(uid) {
        return Boolean(await Tenant.exists({ tenantId: uid, role: "owner" }));
    },
    firstFor: (uid) => Tenant.findOne({ tenantId: uid }).lean<TenantRecord>(),
    forPerson: (uid, email) => Tenant.find({ $or: [{ tenantId: uid }, { email }] }).lean<TenantRecord[]>(),
    async hasRole(resId, role, { uid, email }) {
        return Boolean(await Tenant.exists({ resId, role, $or: [{ tenantId: uid }, { email }] }));
    },
    // the ids are restaurants this owner owns, not raw input; sanitizeFilter would strip the $in
    inRestaurants: (resIds) => Tenant.find({ resId: mongoose.trusted({ $in: resIds }) }).lean<TenantRecord[]>(),
    async createMany(list) {
        return (await Tenant.insertMany(list)).map((t) => t.toObject() as unknown as TenantRecord);
    },
    get: (resId, id) => Tenant.findOne({ _id: id, resId }).lean<TenantRecord>(),
    update: (resId, id, fields) =>
        Tenant.findOneAndUpdate({ _id: id, resId }, fields, { new: true, runValidators: true }).lean<TenantRecord>(),
    remove: (resId, id) => Tenant.findOneAndDelete({ _id: id, resId }).lean<TenantRecord>(),
};
