import { assertId, assertRestaurantAccess, badRequest, HttpError, notFound, type AppUser } from "@vmenu/common";
import type { RestaurantsRepo } from "../repositories/restaurants.repo.js";
import type { TenantsRepo } from "../repositories/tenants.repo.js";
import { str, type Body } from "./input.js";

const STAFF_ROLES = ["cashier", "chef"] as const;
const isStaffRole = (r: unknown): r is (typeof STAFF_ROLES)[number] => STAFF_ROLES.includes(r as never);

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

        async add(user: AppUser, slug: string, body: Body) {
            const resId = await owned(user, slug);
            const name = str(body?.name, 120);
            const email = str(body?.email, 200)?.toLowerCase();
            const tenantId = str(body?.tenantId, 128);
            const role = body?.role;
            if (!name || !email || !tenantId || !isStaffRole(role))
                throw badRequest("Name, email, account id and a cashier or chef role are required");
            if (await tenants.hasRole(resId, role, { uid: tenantId, email }))
                throw new HttpError(409, "This person already has that role here");
            const [created] = await tenants.createMany([{ name, email, tenantId, role, resId }]);
            return created;
        },

        async update(user: AppUser, slug: string, id: string, body: Body) {
            const { resId, member: m } = await member(user, slug, id);
            const fields: { name?: string; email?: string; role?: "cashier" | "chef" } = {};
            const name = str(body?.name, 120);
            const email = str(body?.email, 200)?.toLowerCase();
            if (name) fields.name = name;
            if (email) fields.email = email;
            if (body?.role !== undefined) {
                if (!isStaffRole(body.role)) throw badRequest("Role must be cashier or chef");
                fields.role = body.role;
            }
            return (await tenants.update(resId, id, fields)) ?? m;
        },

        async remove(user: AppUser, slug: string, id: string) {
            const { resId, member: m } = await member(user, slug, id);
            return (await tenants.remove(resId, id)) ?? m;
        },
    };
}
