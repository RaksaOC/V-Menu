import { HttpError, assertRestaurantAccess, badRequest, notFound, parse, type AppUser } from "@vmenu/common";
import {
    DEFAULT_MONEY,
    OwnerIdQuery,
    PublicRestaurant,
    UpdateSettingsBody,
    type CreateRestaurantBody,
    type RestaurantSettings,
} from "@vmenu/contracts";
import type { RestaurantRecord, RestaurantsRepo } from "../repositories/restaurants.repo.js";
import type { MembershipsRepo } from "../repositories/memberships.repo.js";

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

/** VM-24: the settings any page may read, with the defaults for a restaurant that never set them. */
const settingsOf = (r: RestaurantRecord): RestaurantSettings => ({
    name: r.name,
    currency: r.settings?.currency ?? DEFAULT_MONEY.currency,
    khrPerUsd: r.settings?.khrPerUsd ?? DEFAULT_MONEY.khrPerUsd,
    paymentQrUrl: r.settings?.paymentQrUrl ?? null,
});

/** Restaurants: creating them, and finding them for other services (CL-04). */
export function restaurantsService({ restaurants, memberships }: { restaurants: RestaurantsRepo; memberships: MembershipsRepo }) {
    // A new restaurant gives its owner all three roles, as the original signup did.
    async function createForOwner(name: string, owner: { uid: string; email: string; name: string }) {
        const restaurant = await restaurants.create({ name, slug: generateSlug(name), ownerId: owner.uid });
        await memberships.createMany(
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
            const me = await memberships.firstFor(user.uid);
            return createForOwner(name, { uid: user.uid, email: user.email, name: me?.name ?? user.email });
        },

        listOwned: (uid: string) => restaurants.ownedBy(uid),

        /** The full restaurant behind a slug, or 404. */
        async find(slug: string) {
            const r = await restaurants.bySlug(slug);
            if (!r) throw notFound("Restaurant not found");
            return r;
        },

        /** VM-21: for anyone, signed in or not. The schema keeps it to the public fields. */
        async publicInfo(slug: string): Promise<PublicRestaurant> {
            const r = await restaurants.bySlug(slug);
            if (!r) throw new HttpError(404, "We couldn't find this restaurant.", "RESTAURANT_NOT_FOUND");
            return PublicRestaurant.parse(r);
        },

        /** VM-24: for anyone, signed in or not: customers' pages show prices in this currency. */
        async settings(slug: string) {
            const r = await restaurants.bySlug(slug);
            if (!r) throw notFound("Restaurant not found");
            return settingsOf(r);
        },

        /** VM-24: the restaurant's owner changes its settings. */
        async updateSettings(user: AppUser, slug: string, body: unknown) {
            const r = await restaurants.bySlug(slug);
            if (!r) throw notFound("Restaurant not found");
            assertRestaurantAccess(user, { _id: String(r._id), ownerId: r.ownerId });
            const changes = parse(UpdateSettingsBody, body);
            // the QR must be a photo uploaded for this restaurant, not another one's
            if (changes.paymentQrUrl && !changes.paymentQrUrl.startsWith(`/api/menu/${r.slug}/images/`))
                throw badRequest("Upload the payment QR for this restaurant");
            return settingsOf((await restaurants.updateSettings(String(r._id), changes)) ?? r);
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
