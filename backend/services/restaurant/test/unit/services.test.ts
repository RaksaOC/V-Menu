import { describe, expect, it } from "vitest";
import { authService } from "../../src/services/auth.service.js";
import { generateSlug, restaurantsService } from "../../src/services/restaurants.service.js";
import { sessionHours } from "../../src/services/session.js";
import { staffService } from "../../src/services/staff.service.js";
import { fakeRestaurants, fakeMemberships, newId } from "./fakes.js";

// CL-04: restaurant-service's business rules, with in-memory repositories (no MongoDB, no HTTP).
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123"; // login signs app tokens
const status = (p: Promise<unknown>) => p.then(() => 200).catch((e: { status?: number }) => e.status ?? 500);
const ALICE = { uid: "alice", email: "alice@x.test" };
const owner = (uid = ALICE.uid) => ({ uid, email: `${uid}@x.test`, role: "owner" as const });

function setup() {
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

describe("restaurants", () => {
    it("slugs are '<name>-<6 chars>', with a fallback for names with no letters", () => {
        expect(generateSlug("Mee Keav & Co!")).toMatch(/^mee-keav-co-[a-z0-9]{1,6}$/);
        expect(generateSlug("!!!")).toMatch(/^restaurant-[a-z0-9]{1,6}$/);
    });

    it("a new restaurant gives its owner all three roles", async () => {
        const { places, memberships } = setup();
        const r = await places.createForOwner("Mee Keav", { uid: "alice", email: "alice@x.test", name: "Alice" });
        expect(r.ownerId).toBe("alice");
        expect(memberships.all.map((t) => t.role).sort()).toEqual(["cashier", "chef", "owner"]);
        expect(memberships.all.every((t) => t.resId === String(r._id) && t.name === "Alice")).toBe(true);
    });

    it("an owner adds another restaurant (named after their earlier sign-up) and lists theirs, oldest first", async () => {
        const { places } = setup();
        await places.createForOwner("First", { ...ALICE, name: "Alice" });
        const second = await places.create(owner(), { name: "Second" });
        expect(second.name).toBe("Second");
        const fresh = await places.create(owner("bob"), { name: "Bob's" }); // no earlier sign-up: email as name
        expect(fresh.ownerId).toBe("bob");
        expect((await places.listOwned("alice")).map((r) => r.name)).toEqual(["First", "Second"]);
    });

    it("lookups for other services: by slug (404 if unknown) and by owner (ownerId required)", async () => {
        const { places } = setup();
        const r = await places.createForOwner("Mee Keav", { ...ALICE, name: "Alice" });
        expect(await places.bySlug(r.slug)).toEqual({ _id: String(r._id), name: "Mee Keav", slug: r.slug, ownerId: "alice" });
        expect(await status(places.bySlug("nope"))).toBe(404);
        expect((await places.forOwner({ ownerId: "alice" })).map((x) => x.slug)).toEqual([r.slug]);
        expect(await status(places.forOwner({}))).toBe(400);
    });
});

describe("sign-up and sign-in", () => {
    it("needs a verified Firebase ID token", async () => {
        const { auth } = setup();
        expect(await status(auth.memberships({}))).toBe(401);
        expect(await status(auth.memberships({ idToken: "forged" }))).toBe(401);
        expect(await status(auth.signup(undefined))).toBe(401);
    });

    it("signs up an owner once", async () => {
        const { auth } = setup();
        const res = await auth.signup({ idToken: "id:alice", ownerName: "Alice", resName: "Mee Keav" });
        expect(res).toMatchObject({ message: "Account created" });
        expect(res.slug).toMatch(/^mee-keav-/);
        expect(await status(auth.signup({ idToken: "id:alice", ownerName: "Alice", resName: "Again" }))).toBe(409);
        expect(await status(auth.signup({ idToken: "id:bob", ownerName: "Bob" }))).toBe(400);
    });

    it("lists a person's restaurants and roles, by account or by email", async () => {
        const { auth, places, memberships } = setup();
        const r = await places.createForOwner("Mee Keav", { ...ALICE, name: "Alice" });
        await memberships.createMany([
            { name: "Bob", tenantId: "pending", email: "bob@x.test", role: "chef", resId: String(r._id) }, // invited by email
            { name: "Bob", tenantId: "bob", email: "bob@x.test", role: "chef", resId: String(r._id) }, // same role twice
            { name: "Bob", tenantId: "bob", email: "bob@x.test", role: "cashier", resId: "gone-restaurant" },
        ]);
        expect(await auth.memberships({ idToken: "id:bob" })).toEqual({ [`Mee Keav - ${r.slug}`]: ["chef"] });
        expect(await auth.memberships({ idToken: "id:alice" })).toEqual({ [`Mee Keav - ${r.slug}`]: ["owner", "cashier", "chef"] });
    });

    it("an owner gets an owner token; staff get a token for one restaurant they belong to", async () => {
        const { auth, places, memberships } = setup();
        const r = await places.createForOwner("Mee Keav", { ...ALICE, name: "Alice" });
        await memberships.createMany([{ name: "Bob", tenantId: "bob", email: "bob@x.test", role: "chef", resId: String(r._id) }]);
        expect((await auth.login({ idToken: "id:alice", role: "owner" })).role).toBe("owner");
        const chef = await auth.login({ idToken: "id:bob", role: "chef", resSlug: r.slug });
        expect(chef.role).toBe("chef");
        expect(chef.token.split(".")).toHaveLength(3);
        expect(chef.hours).toBe(sessionHours());
        expect(await status(auth.login({ idToken: "id:bob", role: "owner" }))).toBe(401);
        expect(await status(auth.login({ idToken: "id:bob", role: "cashier", resSlug: r.slug }))).toBe(401);
        expect(await status(auth.login({ idToken: "id:bob", role: "chef" }))).toBe(400);
        expect(await status(auth.login({ idToken: "id:bob", role: "chef", resSlug: "nope" }))).toBe(404);
        expect(await status(auth.login({ idToken: "id:bob", role: "admin" }))).toBe(400);
    });

    it("a session lasts 12 hours unless SESSION_HOURS says 1 to 24 (VM-03)", () => {
        const before = process.env.SESSION_HOURS;
        for (const [v, h] of [
            ["8", 8],
            ["0", 12],
            ["30", 12],
            ["x", 12],
        ] as const) {
            process.env.SESSION_HOURS = v;
            expect(sessionHours()).toBe(h);
        }
        delete process.env.SESSION_HOURS;
        expect(sessionHours()).toBe(12);
        if (before !== undefined) process.env.SESSION_HOURS = before;
    });
});

describe("staff", () => {
    async function seeded() {
        const s = setup();
        const r = await s.places.createForOwner("Mee Keav", { ...ALICE, name: "Alice" });
        const other = await s.places.createForOwner("Other", { uid: "zed", email: "zed@x.test", name: "Zed" });
        return { ...s, r, other };
    }
    const bob = { name: "Bob", email: "BOB@x.test", tenantId: "bob", role: "chef" };

    it("adds a cashier or chef once, lists them, and the owner overview groups by restaurant", async () => {
        const { staff, r } = await seeded();
        const added = await staff.add(owner(), r.slug, bob);
        expect(added).toMatchObject({ name: "Bob", email: "bob@x.test", role: "chef", resId: String(r._id) });
        expect(await status(staff.add(owner(), r.slug, bob))).toBe(409);
        expect(await status(staff.add(owner(), r.slug, { ...bob, role: "owner" }))).toBe(400);
        expect(await status(staff.add(owner(), r.slug, { name: "No email", tenantId: "x", role: "chef" }))).toBe(400);
        expect((await staff.list(owner(), r.slug)).map((t) => t.role).sort()).toEqual(["cashier", "chef", "chef", "owner"]);
        const overview = await staff.overview("alice");
        expect(overview).toHaveLength(1);
        expect(overview[0].resName).toBe("Mee Keav");
        expect(overview[0].staff).toHaveLength(4);
    });

    it("edits and removes staff, but never the owner role, and only in your own restaurant", async () => {
        const { staff, memberships, r, other } = await seeded();
        const added = await staff.add(owner(), r.slug, bob);
        const edited = await staff.update(owner(), r.slug, added._id, { name: "Robert", email: "ROB@x.test", role: "cashier" });
        expect(edited).toMatchObject({ name: "Robert", email: "rob@x.test", role: "cashier" });
        expect((await staff.update(owner(), r.slug, added._id, {})).name).toBe("Robert");
        expect(await status(staff.update(owner(), r.slug, added._id, { role: "owner" }))).toBe(400);
        const ownerRow = memberships.all.find((t) => t.resId === String(r._id) && t.role === "owner")!;
        expect(await status(staff.update(owner(), r.slug, ownerRow._id, { name: "x" }))).toBe(400);
        expect(await status(staff.remove(owner(), r.slug, ownerRow._id))).toBe(400);
        expect(await status(staff.list(owner(), other.slug))).toBe(403); // Zed's restaurant
        expect(await status(staff.update(owner(), r.slug, "bad", {}))).toBe(400);
        expect(await status(staff.remove(owner(), r.slug, newId()))).toBe(404);
        expect((await staff.remove(owner(), r.slug, added._id)).name).toBe("Robert");
        expect(await status(staff.list(owner(), "nope"))).toBe(404);
    });
});

describe("staff roles matched by email need a verified email (VM-13)", () => {
    // Bob is the bistro's cashier by email; his account isn't linked yet (no tenantId).
    async function bistroWithBob() {
        const s = setup();
        const r = await s.places.createForOwner("Bistro", { uid: "owner", email: "owner@x.test", name: "Ory" });
        await s.memberships.createMany([{ name: "Bob", tenantId: "", email: "bob@x.test", role: "cashier", resId: String(r._id) }]);
        return { ...s, slug: r.slug };
    }

    it("someone who signed up with Bob's email but hasn't verified it gets 401", async () => {
        const { auth, slug } = await bistroWithBob();
        expect(await status(auth.login({ idToken: "unverified:mallory:bob@x.test", role: "cashier", resSlug: slug }))).toBe(401);
    });

    it("Bob, with his email verified, gets in", async () => {
        const { auth, slug } = await bistroWithBob();
        const res = await auth.login({ idToken: "id:bob:bob@x.test", role: "cashier", resSlug: slug });
        expect(res.role).toBe("cashier");
    });

    it("the roles list shows nothing for an unverified email match", async () => {
        const { auth, slug } = await bistroWithBob();
        expect(await auth.memberships({ idToken: "unverified:mallory:bob@x.test" })).toEqual({});
        expect(await auth.memberships({ idToken: "id:bob:bob@x.test" })).toEqual({ [`Bistro - ${slug}`]: ["cashier"] });
    });

    it("a match by account still works before the email is verified (the owner, right after sign-up)", async () => {
        const { auth, slug } = await bistroWithBob();
        expect((await auth.login({ idToken: "unverified:owner:owner@x.test", role: "owner" })).role).toBe("owner");
        expect((await auth.login({ idToken: "unverified:owner:owner@x.test", role: "chef", resSlug: slug })).role).toBe("chef");
    });
});

describe("staff invites (VM-12)", () => {
    async function twoRestaurants() {
        const s = setup();
        const r = await s.places.createForOwner("Mee Keav", { ...ALICE, name: "Alice" });
        const other = await s.places.createForOwner("Other", { uid: "zed", email: "zed@x.test", name: "Zed" });
        return { ...s, r, other };
    }
    const row = (s: { memberships: { all: { email: string; resId: string; tenantId: string | null }[] } }, email: string, resId: string) =>
        s.memberships.all.find((t) => t.email === email && t.resId === resId)!;

    it("the owner invites by name, email and role; there's no account to link yet", async () => {
        const s = await twoRestaurants();
        const added = await s.staff.add(owner(), s.r.slug, { name: "Bob", email: "BOB@x.test", role: "cashier" });
        expect(added).toMatchObject({ name: "Bob", email: "bob@x.test", role: "cashier", tenantId: null });
        // an account id in the body is ignored: the owner can't attach the role to someone's account
        const sneaky = await s.staff.add(owner(), s.r.slug, { name: "Eve", email: "eve@x.test", role: "chef", tenantId: "someone-else" });
        expect(sneaky.tenantId).toBeNull();
        expect(await status(s.staff.add(owner(), s.r.slug, { name: "Bob again", email: "bob@X.test", role: "cashier" }))).toBe(409);
    });

    it("the first verified sign-in links the invite to that account", async () => {
        const s = await twoRestaurants();
        await s.staff.add(owner(), s.r.slug, { name: "Bob", email: "bob@x.test", role: "cashier" });
        expect(await s.auth.memberships({ idToken: "id:bob-uid:bob@x.test" })).toEqual({ [`Mee Keav - ${s.r.slug}`]: ["cashier"] });
        expect(row(s, "bob@x.test", String(s.r._id)).tenantId).toBe("bob-uid");
        expect((await s.auth.login({ idToken: "id:bob-uid:bob@x.test", role: "cashier", resSlug: s.r.slug })).role).toBe("cashier");
    });

    it("signing straight in (without the roles list first) links it too", async () => {
        const s = await twoRestaurants();
        await s.staff.add(owner(), s.r.slug, { name: "Bob", email: "bob@x.test", role: "chef" });
        expect((await s.auth.login({ idToken: "id:bob-uid:bob@x.test", role: "chef", resSlug: s.r.slug })).role).toBe("chef");
        expect(row(s, "bob@x.test", String(s.r._id)).tenantId).toBe("bob-uid");
    });

    it("an unverified sign-in doesn't link it, and doesn't get in", async () => {
        const s = await twoRestaurants();
        await s.staff.add(owner(), s.r.slug, { name: "Bob", email: "bob@x.test", role: "cashier" });
        expect(await s.auth.memberships({ idToken: "unverified:mallory:bob@x.test" })).toEqual({});
        expect(await status(s.auth.login({ idToken: "unverified:mallory:bob@x.test", role: "cashier", resSlug: s.r.slug }))).toBe(401);
        expect(row(s, "bob@x.test", String(s.r._id)).tenantId).toBeNull();
    });

    it("once linked, the invite belongs to that account", async () => {
        const s = await twoRestaurants();
        await s.staff.add(owner(), s.r.slug, { name: "Bob", email: "bob@x.test", role: "cashier" });
        await s.auth.memberships({ idToken: "id:bob-uid:bob@x.test" });
        // a later account with that email (say Bob deleted his and made a new one) gets nothing
        expect(await s.auth.memberships({ idToken: "id:another-uid:bob@x.test" })).toEqual({});
        expect(await status(s.auth.login({ idToken: "id:another-uid:bob@x.test", role: "cashier", resSlug: s.r.slug }))).toBe(401);
        expect(row(s, "bob@x.test", String(s.r._id)).tenantId).toBe("bob-uid");
    });

    it("the same email can be staff at two restaurants", async () => {
        const s = await twoRestaurants();
        const zed = { uid: "zed", email: "zed@x.test", role: "owner" as const };
        await s.staff.add(owner(), s.r.slug, { name: "Bob", email: "bob@x.test", role: "cashier" });
        await s.staff.add(zed, s.other.slug, { name: "Bob", email: "bob@x.test", role: "chef" });
        expect(await s.auth.memberships({ idToken: "id:bob-uid:bob@x.test" })).toEqual({
            [`Mee Keav - ${s.r.slug}`]: ["cashier"],
            [`Other - ${s.other.slug}`]: ["chef"],
        });
        expect(row(s, "bob@x.test", String(s.other._id)).tenantId).toBe("bob-uid");
    });
});
