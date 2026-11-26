import { assertId, assertRestaurantAccess, badRequest, HttpError, notFound, parse, type AppUser } from "@vmenu/common";
import { AddStaffBody, UpdateStaffBody } from "@vmenu/contracts";
import type { RestaurantsRepo } from "../repositories/restaurants.repo.js";
import type { MembershipsRepo } from "../repositories/memberships.repo.js";

/** An owner's staff: cashiers and chefs per restaurant (CL-04). */
export function staffService({ restaurants, memberships }: { restaurants: RestaurantsRepo; memberships: MembershipsRepo }) {
    async function owned(user: AppUser, slug: string) {
        const restaurant = await restaurants.bySlug(slug);
        if (!restaurant) throw notFound("Restaurant not found");
        assertRestaurantAccess(user, { _id: String(restaurant._id), ownerId: restaurant.ownerId });
        return String(restaurant._id);
    }

    async function member(user: AppUser, slug: string, id: string) {
        const resId = await owned(user, slug);
        assertId(id, "staff id");
        const m = await memberships.get(resId, id);
        if (!m) throw notFound("Staff member not found");
        if (m.role === "owner") throw badRequest("The owner role cannot be changed here");
        return { resId, member: m };
    }

    return {
        /** Every restaurant this owner has, with its staff: [{ resName, staff: [...] }] */
        async overview(uid: string) {
            const list = await restaurants.ownedBy(uid);
            const staff = await memberships.inRestaurants(list.map((r) => String(r._id)));
            return list.map((r) => ({ resName: r.name, staff: staff.filter((s) => s.resId === String(r._id)) }));
        },

        async list(user: AppUser, slug: string) {
            return memberships.inRestaurants([await owned(user, slug)]);
        },

        async add(user: AppUser, slug: string, body: unknown) {
            const resId = await owned(user, slug); // access first: 403 before 400
            const { name, email, role } = parse(AddStaffBody, body);
            // VM-12: an invite. The email arrives lowercased, so this is a case-insensitive match.
            if (await memberships.emailHasRole(resId, role, email)) throw new HttpError(409, "This person already has that role here");
            // No account yet: the person's first verified sign-in links it (auth.service).
            // SEC-03: the row starts at the current time in milliseconds. Versions only go up by one
            // per change a person makes (a role change, "sign out everywhere"), so every version
            // issued before is below it. Someone removed and invited again can't use a token that
            // was ended while they were staff: it doesn't match the new row.
            const [created] = await memberships.createMany([{ name, email, tenantId: null, role, resId, tokenVersion: Date.now() }]);
            return created;
        },

        async update(user: AppUser, slug: string, id: string, body: unknown) {
            const { resId, member: m } = await member(user, slug, id);
            const fields = parse(UpdateStaffBody, body);
            const role = fields.role ?? m.role;
            const email = fields.email ?? m.email;
            // VM-12: a row linked to an account belongs to that person. A new email means another
            // person, so the row goes back to being an invite, for the new email.
            const unlink = email !== m.email && m.tenantId !== null;
            const tenantId = unlink ? null : m.tenantId;
            // VM-18: only when this edit changes who or what the row is, so old duplicates can still be renamed
            if ((role !== m.role || email !== m.email) && (await memberships.otherRowHasRole(resId, id, role, { email, tenantId })))
                throw new HttpError(409, "This person already has that role here");
            // SEC-03: a new role, or another person, means a new sign-in; the old tokens stop working
            return (await memberships.update(resId, id, fields, { endSessions: role !== m.role, unlink })) ?? m;
        },

        async remove(user: AppUser, slug: string, id: string) {
            const { resId, member: m } = await member(user, slug, id);
            return (await memberships.remove(resId, id)) ?? m;
        },
    };
}
