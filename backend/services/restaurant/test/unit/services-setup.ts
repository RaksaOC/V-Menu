import { authService } from "../../src/services/auth.service.js";
import { restaurantsService } from "../../src/services/restaurants.service.js";
import { staffService } from "../../src/services/staff.service.js";
import { fakeMemberships, fakeRestaurants } from "./fakes.js";

// CL-04: restaurant-service's business rules, with in-memory repositories (no MongoDB, no HTTP).
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123"; // login signs app tokens
export const status = (p: Promise<unknown>) => p.then(() => 200).catch((e: { status?: number }) => e.status ?? 500);
export const ALICE = { uid: "alice", email: "alice@x.test" };
export const owner = (uid = ALICE.uid) => ({ uid, email: `${uid}@x.test`, role: "owner" as const });

export function setup() {
    const restaurants = fakeRestaurants();
    const memberships = fakeMemberships();
    // the fake Firebase: "id:<uid>[:<email>]" is a verified sign-in, "unverified:<uid>:<email>" one
    // whose email isn't verified yet (VM-13); anything else is refused
    const verifyIdToken = async (t: string) => {
        const [kind, uid, email] = t.split(":");
        if ((kind !== "id" && kind !== "unverified") || !uid) throw new Error("bad token");
        return { uid, email: email ?? `${uid}@x.test`, emailVerified: kind === "id" };
    };
    const places = restaurantsService({ restaurants, memberships });
    return {
        restaurants,
        memberships,
        places,
        auth: authService({ restaurants, memberships, verifyIdToken, places }),
        staff: staffService({ restaurants, memberships }),
    };
}
