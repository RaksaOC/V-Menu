import mongoose from "mongoose";
import { Membership } from "../models/membership.model.js";

export type TenantRole = "owner" | "cashier" | "chef";
export interface MembershipRecord {
    _id: string;
    name: string;
    /** the person's Firebase uid; null for an invite nobody has accepted yet (VM-12) */
    tenantId: string | null;
    email: string;
    role: TenantRole;
    resId: string;
    /** SEC-03: tokens issued with an older number no longer work; missing on old rows, meaning 0 */
    tokenVersion?: number;
}
type NewTenant = Omit<MembershipRecord, "_id" | "tokenVersion">;
/** Who is signing in. VM-13: an email match counts only when Firebase verified the email. */
export interface Person {
    uid: string;
    email: string;
    emailVerified: boolean;
}

/**
 * Their account, and invites for their email if it's verified: anyone can sign up with someone
 * else's email (VM-13). VM-12: an invite that an account has taken stays with that account.
 */
const matching = ({ uid, email, emailVerified }: Person) =>
    emailVerified ? { $or: [{ tenantId: uid }, { email, tenantId: null }] } : { tenantId: uid };

/** Every MongoDB query on memberships: who has which role where (CL-04). */
export interface MembershipsRepo {
    /** has this account an owner role anywhere */
    isOwner(uid: string): Promise<boolean>;
    firstFor(uid: string): Promise<MembershipRecord | null>;
    /** every role of this person, matched by account, or by verified email (VM-13) */
    forPerson(who: Person): Promise<MembershipRecord[]>;
    hasRole(resId: string, role: string, who: Person): Promise<boolean>;
    /** is this email already listed with this role here, linked or not (VM-12: no duplicate invites) */
    emailHasRole(resId: string, role: string, email: string): Promise<boolean>;
    /** VM-18: has this person (same email, or same account) got this role in another row here */
    otherRowHasRole(resId: string, id: string, role: string, who: Pick<MembershipRecord, "email" | "tenantId">): Promise<boolean>;
    /** VM-12: gives this account every invite for its email that no account has taken yet. Call it
     *  only with a verified email (VM-13). Returns how many were linked. */
    linkInvites(email: string, uid: string): Promise<number>;
    inRestaurants(resIds: string[]): Promise<MembershipRecord[]>;
    createMany(list: NewTenant[]): Promise<MembershipRecord[]>;
    get(resId: string, id: string): Promise<MembershipRecord | null>;
    /** null when there's no such membership in this restaurant */
    update(
        resId: string,
        id: string,
        fields: Partial<Pick<MembershipRecord, "name" | "email" | "role">>,
        opts?: { endSessions?: boolean },
    ): Promise<MembershipRecord | null>;
    remove(resId: string, id: string): Promise<MembershipRecord | null>;
    /** SEC-03: the highest version among this account's rows for this role (and restaurant); null if none */
    sessionVersion(uid: string, role: string, resId?: string): Promise<number | null>;
    /** SEC-03: ends every session of this account, in every restaurant */
    endSessions(uid: string): Promise<void>;
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
    async emailHasRole(resId, role, email) {
        return Boolean(await Membership.exists({ resId, role, email }));
    },
    async otherRowHasRole(resId, id, role, { email, tenantId }) {
        // no account yet (null) says nothing: two pending invites aren't the same person
        const samePerson = tenantId ? [{ email }, { tenantId }] : [{ email }];
        return Boolean(await Membership.exists({ resId, role, _id: mongoose.trusted({ $ne: id }), $or: samePerson }));
    },
    async linkInvites(email, uid) {
        return (await Membership.updateMany({ email, tenantId: null }, { $set: { tenantId: uid } })).modifiedCount;
    },
    // the ids are restaurants this owner owns, not raw input; sanitizeFilter would strip the $in
    inRestaurants: (resIds) => Membership.find({ resId: mongoose.trusted({ $in: resIds }) }).lean<MembershipRecord[]>(),
    async createMany(list) {
        return (await Membership.insertMany(list)).map((t) => t.toObject() as unknown as MembershipRecord);
    },
    get: (resId, id) => Membership.findOne({ _id: id, resId }).lean<MembershipRecord>(),
    update: (resId, id, fields, { endSessions = false } = {}) =>
        Membership.findOneAndUpdate(
            { _id: id, resId },
            { $set: fields, ...(endSessions ? { $inc: { tokenVersion: 1 } } : {}) },
            {
                new: true,
                runValidators: true,
            },
        ).lean<MembershipRecord>(),
    remove: (resId, id) => Membership.findOneAndDelete({ _id: id, resId }).lean<MembershipRecord>(),
    async sessionVersion(uid, role, resId) {
        const rows = await Membership.find({ tenantId: uid, role, ...(resId ? { resId } : {}) }, { tokenVersion: 1 }).lean<
            Pick<MembershipRecord, "tokenVersion">[]
        >();
        return rows.length ? Math.max(...rows.map((t) => t.tokenVersion ?? 0)) : null;
    },
    async endSessions(uid) {
        await Membership.updateMany({ tenantId: uid }, { $inc: { tokenVersion: 1 } });
    },
};
