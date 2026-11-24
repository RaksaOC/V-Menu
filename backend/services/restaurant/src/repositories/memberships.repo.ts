import mongoose from "mongoose";
import { Membership } from "../models/membership.model.js";

export type TenantRole = "owner" | "cashier" | "chef";
export interface MembershipRecord {
    _id: string;
    name: string;
    tenantId: string;
    email: string;
    role: TenantRole;
    resId: string;
}
type NewTenant = Omit<MembershipRecord, "_id">;

/** Every MongoDB query on memberships: who has which role where (CL-04). */
export interface MembershipsRepo {
    /** has this account an owner role anywhere */
    isOwner(uid: string): Promise<boolean>;
    firstFor(uid: string): Promise<MembershipRecord | null>;
    /** every role of this person, matched by account or by email */
    forPerson(uid: string, email: string): Promise<MembershipRecord[]>;
    hasRole(resId: string, role: string, who: { uid: string; email: string }): Promise<boolean>;
    inRestaurants(resIds: string[]): Promise<MembershipRecord[]>;
    createMany(list: NewTenant[]): Promise<MembershipRecord[]>;
    get(resId: string, id: string): Promise<MembershipRecord | null>;
    /** null when there's no such membership in this restaurant */
    update(resId: string, id: string, fields: Partial<Pick<MembershipRecord, "name" | "email" | "role">>): Promise<MembershipRecord | null>;
    remove(resId: string, id: string): Promise<MembershipRecord | null>;
}

export const mongoMembershipsRepo: MembershipsRepo = {
    async isOwner(uid) {
        return Boolean(await Membership.exists({ tenantId: uid, role: "owner" }));
    },
    firstFor: (uid) => Membership.findOne({ tenantId: uid }).lean<MembershipRecord>(),
    forPerson: (uid, email) => Membership.find({ $or: [{ tenantId: uid }, { email }] }).lean<MembershipRecord[]>(),
    async hasRole(resId, role, { uid, email }) {
        return Boolean(await Membership.exists({ resId, role, $or: [{ tenantId: uid }, { email }] }));
    },
    // the ids are restaurants this owner owns, not raw input; sanitizeFilter would strip the $in
    inRestaurants: (resIds) => Membership.find({ resId: mongoose.trusted({ $in: resIds }) }).lean<MembershipRecord[]>(),
    async createMany(list) {
        return (await Membership.insertMany(list)).map((t) => t.toObject() as unknown as MembershipRecord);
    },
    get: (resId, id) => Membership.findOne({ _id: id, resId }).lean<MembershipRecord>(),
    update: (resId, id, fields) =>
        Membership.findOneAndUpdate({ _id: id, resId }, fields, { new: true, runValidators: true }).lean<MembershipRecord>(),
    remove: (resId, id) => Membership.findOneAndDelete({ _id: id, resId }).lean<MembershipRecord>(),
};
