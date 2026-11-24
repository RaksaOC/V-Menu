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
/** Who is signing in. VM-13: an email match counts only when Firebase verified the email. */
export interface Person {
    uid: string;
    email: string;
    emailVerified: boolean;
}

/** Their account, and their email if it's verified: anyone can sign up with someone else's email. */
const matching = ({ uid, email, emailVerified }: Person) => (emailVerified ? { $or: [{ tenantId: uid }, { email }] } : { tenantId: uid });

/** Every MongoDB query on memberships: who has which role where (CL-04). */
export interface MembershipsRepo {
    /** has this account an owner role anywhere */
    isOwner(uid: string): Promise<boolean>;
    firstFor(uid: string): Promise<MembershipRecord | null>;
    /** every role of this person, matched by account, or by verified email (VM-13) */
    forPerson(who: Person): Promise<MembershipRecord[]>;
    hasRole(resId: string, role: string, who: Person): Promise<boolean>;
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
    forPerson: (who) => Membership.find(matching(who)).lean<MembershipRecord[]>(),
    async hasRole(resId, role, who) {
        return Boolean(await Membership.exists({ resId, role, ...matching(who) }));
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
