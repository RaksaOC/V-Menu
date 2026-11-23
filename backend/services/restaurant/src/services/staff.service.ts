import { assertId, assertRestaurantAccess, badRequest, HttpError, notFound, parse, type AppUser } from "@vmenu/common";
import { AddStaffBody, UpdateStaffBody } from "@vmenu/contracts";
import type { RestaurantsRepo } from "../repositories/restaurants.repo.js";
import type { TenantsRepo } from "../repositories/tenants.repo.js";

/** An owner's staff: cashiers and chefs per restaurant (CL-04). */
export function staffService({ restaurants, tenants }: { restaurants: RestaurantsRepo; tenants: TenantsRepo }) {
    async function owned(user: AppUser, slug: string) {
        const restaurant = await restaurants.bySlug(slug);
        if (!restaurant) throw notFound("Restaurant not found");
        assertRestaurantAccess(user, { _id: String(restaurant._id), ownerId: restaurant.ownerId });
        return String(restaurant._id);
    }

    async function member(user: AppUser, slug: string, id: string) {
        const resId = await owned(user, slug);
        assertId(id, "staff id");
        const m = await tenants.get(resId, id);
        if (!m) throw notFound("Staff member not found");
        if (m.role === "owner") throw badRequest("The owner role cannot be changed here");
        return { resId, member: m };
    }

    return {
        /** Every restaurant this owner has, with its staff: [{ resName, staff: [...] }] */
        async overview(uid: string) {
            const list = await restaurants.ownedBy(uid);
            const staff = await tenants.inRestaurants(list.map((r) => String(r._id)));
            return list.map((r) => ({ resName: r.name, staff: staff.filter((s) => s.resId === String(r._id)) }));
        },

        async list(user: AppUser, slug: string) {
            return tenants.inRestaurants([await owned(user, slug)]);
        },

        async add(user: AppUser, slug: string, body: unknown) {
            const resId = await owned(user, slug); // access first: 403 before 400
            const { name, email, tenantId, role } = parse(AddStaffBody, body);
            if (await tenants.hasRole(resId, role, { uid: tenantId, email }))
                throw new HttpError(409, "This person already has that role here");
            const [created] = await tenants.createMany([{ name, email, tenantId, role, resId }]);
            return created;
        },

        async update(user: AppUser, slug: string, id: string, body: unknown) {
            const { resId, member: m } = await member(user, slug, id);
            const fields = parse(UpdateStaffBody, body);
            return (await tenants.update(resId, id, fields)) ?? m;
        },

        async remove(user: AppUser, slug: string, id: string) {
            const { resId, member: m } = await member(user, slug, id);
            return (await tenants.remove(resId, id)) ?? m;
        },
    };
}
