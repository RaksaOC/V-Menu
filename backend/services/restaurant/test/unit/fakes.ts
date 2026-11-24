// In-memory repositories for the service unit tests (CL-04): no MongoDB. Like MongoDB, they hand
// out copies, so a service can't change stored data without calling the repository.
import type { RestaurantRecord, RestaurantsRepo } from "../../src/repositories/restaurants.repo.js";
import type { MembershipRecord, MembershipsRepo, Person } from "../../src/repositories/memberships.repo.js";

let seq = 0;
export const newId = () => (++seq).toString(16).padStart(24, "0");
const copy = <T extends object>(x: T | undefined) => (x ? { ...x } : null);

export function fakeRestaurants(): RestaurantsRepo & { all: RestaurantRecord[] } {
    const all: RestaurantRecord[] = [];
    let clock = 0;
    return {
        all,
        async bySlug(slug) {
            return copy(all.find((r) => r.slug === slug));
        },
        async byIds(ids) {
            return all.filter((r) => ids.includes(r._id)).map((r) => ({ ...r }));
        },
        async ownedBy(ownerId) {
            return all
                .filter((r) => r.ownerId === ownerId)
                .sort((a, b) => +a.createdAt - +b.createdAt)
                .map((r) => ({ ...r }));
        },
        async updateSettings(id, settings) {
            const r = all.find((x) => x._id === id);
            if (!r) return null;
            r.settings = { ...r.settings, ...settings };
            return { ...r, settings: { ...r.settings } };
        },
        async create(fields) {
            const r = { _id: newId(), ...fields, createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, clock++)) };
            all.push(r);
            return { ...r };
        },
    };
}

// like the repo: by account, or an invite for their email when it's verified (VM-13, VM-12)
const matches = (t: MembershipRecord, who: Person) =>
    t.tenantId === who.uid || (who.emailVerified && t.tenantId === null && t.email === who.email);

export function fakeMemberships(): MembershipsRepo & { all: MembershipRecord[] } {
    const all: MembershipRecord[] = [];
    const find = (resId: string, id: string) => all.find((t) => t._id === id && t.resId === resId);
    return {
        all,
        async isOwner(uid) {
            return all.some((t) => t.tenantId === uid && t.role === "owner");
        },
        async firstFor(uid) {
            return copy(all.find((t) => t.tenantId === uid));
        },
        async forPerson(who) {
            return all.filter((t) => matches(t, who)).map((t) => ({ ...t }));
        },
        async hasRole(resId, role, who) {
            return all.some((t) => t.resId === resId && t.role === role && matches(t, who));
        },
        async emailHasRole(resId, role, email) {
            return all.some((t) => t.resId === resId && t.role === role && t.email === email);
        },
        async otherRowHasRole(resId, id, role, { email, tenantId }) {
            return all.some(
                (t) =>
                    t.resId === resId &&
                    t.role === role &&
                    t._id !== id &&
                    (t.email === email || (tenantId !== null && t.tenantId === tenantId)),
            );
        },
        async linkInvites(email, uid) {
            const invites = all.filter((t) => t.email === email && t.tenantId === null);
            for (const t of invites) t.tenantId = uid;
            return invites.length;
        },
        async inRestaurants(resIds) {
            return all.filter((t) => resIds.includes(t.resId)).map((t) => ({ ...t }));
        },
        async createMany(list) {
            const made = list.map((t) => ({ _id: newId(), ...t }));
            all.push(...made);
            return made.map((t) => ({ ...t }));
        },
        async get(resId, id) {
            return copy(find(resId, id));
        },
        async update(resId, id, fields, { endSessions = false } = {}) {
            const t = find(resId, id);
            if (!t) return null;
            Object.assign(t, fields);
            if (endSessions) t.tokenVersion = (t.tokenVersion ?? 0) + 1;
            return { ...t };
        },
        async rowFor(uid, role, resId) {
            return copy(all.find((t) => t.tenantId === uid && t.role === role && (!resId || t.resId === resId)));
        },
        async sessionVersion(uid, role, resId) {
            const rows = all.filter((t) => t.tenantId === uid && t.role === role && (!resId || t.resId === resId));
            return rows.length ? Math.max(...rows.map((t) => t.tokenVersion ?? 0)) : null;
        },
        async endSessions(uid) {
            for (const t of all) if (t.tenantId === uid) t.tokenVersion = (t.tokenVersion ?? 0) + 1;
        },
        async remove(resId, id) {
            const t = find(resId, id);
            if (!t) return null;
            all.splice(all.indexOf(t), 1);
            return { ...t };
        },
    };
}
