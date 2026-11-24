import { decodeJwt } from "jose";
import { describe, expect, it } from "vitest";
import { generateSlug } from "../../src/services/restaurants.service.js";
import { sessionHours } from "../../src/services/session.js";
import { ALICE, owner, setup, status } from "./services-setup.js";

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
            { name: "Bob", tenantId: null, email: "bob@x.test", role: "chef", resId: String(r._id) }, // invited by email
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

describe("session versions (SEC-03)", () => {
    const versionOf = (token: string) => decodeJwt(token).tv;
    async function bistro() {
        const s = setup();
        const r = await s.places.createForOwner("Bistro", { uid: "owner", email: "owner@x.test", name: "Ory" });
        const resId = String(r._id);
        const [cashier] = await s.memberships.createMany([{ name: "Bob", tenantId: "bob", email: "bob@x.test", role: "cashier", resId }]);
        const by = { uid: "owner", email: "owner@x.test", role: "owner" as const };
        const version = (uid = "bob", role = "cashier") => s.auth.sessionVersion({ uid, role, resId });
        return { ...s, r, resId, cashier, by, version };
    }

    it("a new membership starts at 0, and the token carries the version", async () => {
        const { auth, r, version } = await bistro();
        expect(await version()).toEqual({ version: 0 });
        const { token } = await auth.login({ idToken: "id:bob:bob@x.test", role: "cashier", resSlug: r.slug });
        expect(versionOf(token)).toBe(0);
    });

    it("removing someone ends their session", async () => {
        const { staff, r, cashier, by, version } = await bistro();
        await staff.remove(by, r.slug, cashier!._id);
        expect(await version()).toEqual({ version: null });
    });

    it("a role change raises the version, so the old token stops working even if the role comes back", async () => {
        const { staff, r, cashier, by, version } = await bistro();
        await staff.update(by, r.slug, cashier!._id, { role: "chef" });
        expect(await version("bob", "cashier")).toEqual({ version: null });
        expect(await version("bob", "chef")).toEqual({ version: 1 });
        await staff.update(by, r.slug, cashier!._id, { role: "cashier" });
        expect(await version("bob", "cashier")).toEqual({ version: 2 });
    });

    it("an edit that keeps the role doesn't sign them out", async () => {
        const { staff, r, cashier, by, version } = await bistro();
        await staff.update(by, r.slug, cashier!._id, { name: "Robert", role: "cashier" });
        expect(await version()).toEqual({ version: 0 });
    });

    it("a new login after a change carries the new version", async () => {
        const { auth, staff, r, cashier, by } = await bistro();
        await staff.update(by, r.slug, cashier!._id, { role: "chef" });
        const { token } = await auth.login({ idToken: "id:bob:bob@x.test", role: "chef", resSlug: r.slug });
        expect(versionOf(token)).toBe(1);
    });

    it("signing out everywhere raises every role of that person, and nobody else's", async () => {
        const { auth, memberships, resId, version } = await bistro();
        await memberships.createMany([{ name: "Bob", tenantId: "bob", email: "bob@x.test", role: "chef", resId }]);
        await auth.signOutEverywhere("bob");
        expect(await version("bob", "cashier")).toEqual({ version: 1 });
        expect(await version("bob", "chef")).toEqual({ version: 1 });
        expect(await version("owner", "cashier")).toEqual({ version: 0 });
    });

    it("an owner's version covers all their restaurants", async () => {
        const { auth, places } = await bistro();
        await places.create({ uid: "owner", email: "owner@x.test", role: "owner" }, { name: "Second" });
        expect(await auth.sessionVersion({ uid: "owner", role: "owner" })).toEqual({ version: 0 });
        await auth.signOutEverywhere("owner");
        expect(await auth.sessionVersion({ uid: "owner", role: "owner" })).toEqual({ version: 1 });
        const { token } = await auth.login({ idToken: "id:owner:owner@x.test", role: "owner" });
        expect(versionOf(token)).toBe(1);
    });

    it("a staff check needs a restaurant, and odd input is refused", async () => {
        const { auth } = await bistro();
        expect(await auth.sessionVersion({ uid: "bob", role: "cashier" })).toEqual({ version: null });
        expect(await status(auth.sessionVersion({ uid: "bob", role: "admin" }))).toBe(400);
        expect(await status(auth.sessionVersion({ role: "cashier" }))).toBe(400);
    });
});

describe("who am I (VM-20)", () => {
    async function bistro() {
        const s = setup();
        const r = await s.places.createForOwner("Bistro", { uid: "owner", email: "owner@x.test", name: "Ory Chan" });
        const other = await s.places.createForOwner("Other", { uid: "zed", email: "zed@x.test", name: "Zed" });
        await s.memberships.createMany([
            { name: "Bob at Bistro", tenantId: "bob", email: "bob@x.test", role: "cashier", resId: String(r._id) },
            { name: "Bob at Other", tenantId: "bob", email: "bob@x.test", role: "cashier", resId: String(other._id) },
        ]);
        return { ...s, r, other };
    }

    it("an owner gets the name from their sign-up", async () => {
        const { auth } = await bistro();
        expect(await auth.me({ uid: "owner", email: "owner@x.test", role: "owner" })).toEqual({
            name: "Ory Chan",
            email: "owner@x.test",
            role: "owner",
        });
    });

    it("staff get the name from this restaurant's row", async () => {
        const { auth, other } = await bistro();
        const me = await auth.me({ uid: "bob", email: "bob@x.test", role: "cashier", resId: String(other._id), resSlug: other.slug });
        expect(me).toEqual({ name: "Bob at Other", email: "bob@x.test", role: "cashier" });
    });

    it("with no row to read, the email stands in for the name", async () => {
        const { auth } = await bistro();
        expect(await auth.me({ uid: "ghost", email: "ghost@x.test", role: "owner" })).toEqual({
            name: "ghost@x.test",
            email: "ghost@x.test",
            role: "owner",
        });
    });
});
