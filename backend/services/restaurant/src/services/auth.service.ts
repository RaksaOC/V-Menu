import { badRequest, HttpError, parse, signAppToken, unauthorized } from "@vmenu/common";
import { IdTokenBody, LoginBody, SessionVersionQuery, SignupBody } from "@vmenu/contracts";
import type { VerifyIdToken } from "../clients/firebase.js";
import type { RestaurantsRepo } from "../repositories/restaurants.repo.js";
import type { MembershipsRepo } from "../repositories/memberships.repo.js";
import type { restaurantsService } from "./restaurants.service.js";
import { sessionHours } from "./session.js";

interface Deps {
    restaurants: RestaurantsRepo;
    memberships: MembershipsRepo;
    verifyIdToken: VerifyIdToken;
    places: ReturnType<typeof restaurantsService>;
}

/** Sign-up and sign-in: a verified Firebase sign-in becomes an app token (CL-04). */
export function authService({ restaurants, memberships, verifyIdToken, places }: Deps) {
    // The browser signs in with Firebase, then sends the Firebase ID token here.
    async function identity(body: unknown) {
        const given = IdTokenBody.safeParse(body ?? {});
        if (!given.success) throw unauthorized("Missing Firebase ID token");
        try {
            return await verifyIdToken(given.data.idToken);
        } catch {
            throw unauthorized("Firebase sign-in could not be verified");
        }
    }

    /** A staff sign-in. VM-12: a verified email takes up the invites waiting for it (VM-13: never an
     *  unverified one, since anyone can sign up with someone else's email). */
    async function staffIdentity(body: unknown) {
        const who = await identity(body);
        if (who.emailVerified) await memberships.linkInvites(who.email, who.uid);
        return who;
    }

    return {
        /** New owner: creates the restaurant and gives the owner all three roles. */
        async signup(body: unknown) {
            const who = await identity(body);
            const { ownerName, resName } = parse(SignupBody, body); // after the identity: 401 before 400
            if (await memberships.isOwner(who.uid)) throw new HttpError(409, "This account already has a restaurant");
            const restaurant = await places.createForOwner(resName, { uid: who.uid, email: who.email, name: ownerName });
            return { message: "Account created", slug: restaurant.slug };
        },

        /** Which restaurants and roles this person has: { "Name - slug": ["owner", "cashier"] } */
        async memberships(body: unknown) {
            const who = await staffIdentity(body);
            const roles = await memberships.forPerson(who);
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
        async login(body: unknown) {
            const who = await staffIdentity(body);
            const { role, resSlug: slug } = parse(LoginBody, body);
            const hours = sessionHours();
            if (role === "owner") {
                if (!(await memberships.isOwner(who.uid))) throw unauthorized("This account is not a restaurant owner");
                const tv = (await memberships.sessionVersion(who.uid, role)) ?? 0;
                return { role, hours, token: await signAppToken({ uid: who.uid, email: who.email, role, tv }, `${hours}h`) };
            }
            if (!slug) throw badRequest("Restaurant is required");
            const restaurant = await places.find(slug);
            if (!(await memberships.hasRole(String(restaurant._id), role, who)))
                throw unauthorized("You do not have this role at this restaurant");
            const resId = String(restaurant._id);
            const tv = (await memberships.sessionVersion(who.uid, role, resId)) ?? 0;
            const token = await signAppToken({ uid: who.uid, email: who.email, role, resId, resSlug: restaurant.slug, tv }, `${hours}h`);
            return { role, hours, token };
        },

        /** SEC-03: is this session still current? Staff need a restaurant; an owner's covers all of theirs. */
        async sessionVersion(query: unknown) {
            const { uid, role, resId } = parse(SessionVersionQuery, query);
            if (role !== "owner" && !resId) return { version: null };
            return { version: await memberships.sessionVersion(uid, role, role === "owner" ? undefined : resId) };
        },

        /** SEC-03: "Sign out everywhere": every token this account holds stops working. */
        async signOutEverywhere(uid: string) {
            await memberships.endSessions(uid);
        },
    };
}
