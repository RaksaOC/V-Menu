import { notFound, parse, type AppUser } from "@vmenu/common";
import { OwnerIdQuery, type CreateRestaurantBody } from "@vmenu/contracts";
import type { RestaurantRecord, RestaurantsRepo } from "../repositories/restaurants.repo.js";
import type { TenantsRepo } from "../repositories/tenants.repo.js";

function slugify(name: string) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

// Same slug format as before: "<name>-<6 random chars>".
export function generateSlug(name: string) {
    return `${slugify(name) || "restaurant"}-${Math.random().toString(36).substring(2, 8)}`;
}

/** What other services may know about a restaurant. */
const publicShape = (r: RestaurantRecord) => ({ _id: String(r._id), name: r.name, slug: r.slug, ownerId: r.ownerId });

/** Restaurants: creating them, and finding them for other services (CL-04). */
export function restaurantsService({ restaurants, tenants }: { restaurants: RestaurantsRepo; tenants: TenantsRepo }) {
    // A new restaurant gives its owner all three roles, as the original signup did.
    async function createForOwner(name: string, owner: { uid: string; email: string; name: string }) {
        const restaurant = await restaurants.create({ name, slug: generateSlug(name), ownerId: owner.uid });
        await tenants.createMany(
            (["owner", "cashier", "chef"] as const).map((role) => ({
                tenantId: owner.uid,
                name: owner.name,
                email: owner.email,
                role,
                resId: String(restaurant._id),
            })),
        );
        return restaurant;
    }

    return {
        createForOwner,

        /** An owner adds another restaurant. */
        async create(user: AppUser, { name }: CreateRestaurantBody) {
            const me = await tenants.firstFor(user.uid);
            return createForOwner(name, { uid: user.uid, email: user.email, name: me?.name ?? user.email });
        },

        listOwned: (uid: string) => restaurants.ownedBy(uid),

        /** The full restaurant behind a slug, or 404. */
        async find(slug: string) {
            const r = await restaurants.bySlug(slug);
            if (!r) throw notFound("Restaurant not found");
            return r;
        },

        /** For other services: a restaurant by slug. */
        async bySlug(slug: string) {
            const r = await restaurants.bySlug(slug);
            if (!r) throw notFound("Restaurant not found");
            return publicShape(r);
        },

        /** For other services: an owner's restaurants, oldest first. */
        async forOwner(query: unknown) {
            const { ownerId } = parse(OwnerIdQuery, query);
            return (await restaurants.ownedBy(ownerId)).map(publicShape);
        },
    };
}
