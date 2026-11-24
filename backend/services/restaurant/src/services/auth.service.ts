import { badRequest, HttpError, signAppToken, unauthorized, type Role } from "@vmenu/common";
import type { VerifyIdToken } from "../clients/firebase.js";
import type { RestaurantsRepo } from "../repositories/restaurants.repo.js";
import type { TenantsRepo } from "../repositories/tenants.repo.js";
import { str, type Body } from "./input.js";
import type { restaurantsService } from "./restaurants.service.js";
import { sessionHours } from "./session.js";

interface Deps {
    restaurants: RestaurantsRepo;
    tenants: TenantsRepo;
    verifyIdToken: VerifyIdToken;
    places: ReturnType<typeof restaurantsService>;
}

/** Sign-up and sign-in: a verified Firebase sign-in becomes an app token (CL-04). */
export function authService({ restaurants, tenants, verifyIdToken, places }: Deps) {
    // The browser signs in with Firebase, then sends the Firebase ID token here.
    async function identity(body: Body) {
        const idToken = str(body?.idToken, 4096);
        if (!idToken) throw unauthorized("Missing Firebase ID token");
        try {
            return await verifyIdToken(idToken);
        } catch {
            throw unauthorized("Firebase sign-in could not be verified");
        }
    }

    return {
        /** New owner: creates the restaurant and gives the owner all three roles. */
        async signup(body: Body) {
            const who = await identity(body);
            const ownerName = str(body?.ownerName, 120);
            const resName = str(body?.resName, 120);
            if (!ownerName || !resName) throw badRequest("Owner name and restaurant name are required");
            if (await tenants.isOwner(who.uid)) throw new HttpError(409, "This account already has a restaurant");
            const restaurant = await places.createForOwner(resName, { uid: who.uid, email: who.email, name: ownerName });
            return { message: "Account created", slug: restaurant.slug };
        },

        /** Which restaurants and roles this person has: { "Name - slug": ["owner", "cashier"] } */
        async memberships(body: Body) {
            const who = await identity(body);
            const roles = await tenants.forPerson(who.uid, who.email);
            const byId = new Map((await restaurants.byIds([...new Set(roles.map((t) => t.resId))])).map((r) => [String(r._id), r]));
            const map: Record<string, string[]> = {};
            for (const t of roles) {
                const r = byId.get(t.resId);
                if (!r) continue;
                const key = `${r.name} - ${r.slug}`;
                map[key] ??= [];
                if (!map[key].includes(t.role)) map[key].push(t.role);
            }
            return map;
        },

        /** An app token with one role (and, for staff, one restaurant), lasting `hours`. */
        async login(body: Body) {
            const who = await identity(body);
            const role = body?.role as Role;
            if (!["owner", "cashier", "chef"].includes(role)) throw badRequest("Unknown role");
            const hours = sessionHours();
            if (role === "owner") {
                if (!(await tenants.isOwner(who.uid))) throw unauthorized("This account is not a restaurant owner");
                return { role, hours, token: await signAppToken({ uid: who.uid, email: who.email, role }, `${hours}h`) };
            }
            const slug = str(body?.resSlug, 120);
            if (!slug) throw badRequest("Restaurant is required");
            const restaurant = await places.find(slug);
            if (!(await tenants.hasRole(String(restaurant._id), role, who)))
                throw unauthorized("You do not have this role at this restaurant");
            const token = await signAppToken(
                { uid: who.uid, email: who.email, role, resId: String(restaurant._id), resSlug: restaurant.slug },
                `${hours}h`,
            );
            return { role, hours, token };
        },
    };
}
