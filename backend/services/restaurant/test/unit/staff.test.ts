import { describe, expect, it } from "vitest";
import { newId } from "./fakes.js";
import { ALICE, owner, setup, status } from "./services-setup.js";

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
        expect(overview[0]!.resName).toBe("Mee Keav");
        expect(overview[0]!.staff).toHaveLength(4);
    });

    it("edits and removes staff, but never the owner role, and only in your own restaurant", async () => {
        const { staff, memberships, r, other } = await seeded();
        const added = await staff.add(owner(), r.slug, bob);
        const edited = await staff.update(owner(), r.slug, added!._id, { name: "Robert", email: "ROB@x.test", role: "cashier" });
        expect(edited).toMatchObject({ name: "Robert", email: "rob@x.test", role: "cashier" });
        expect((await staff.update(owner(), r.slug, added!._id, {})).name).toBe("Robert");
        expect(await status(staff.update(owner(), r.slug, added!._id, { role: "owner" }))).toBe(400);
        const ownerRow = memberships.all.find((t) => t.resId === String(r._id) && t.role === "owner")!;
        expect(await status(staff.update(owner(), r.slug, ownerRow._id, { name: "x" }))).toBe(400);
        expect(await status(staff.remove(owner(), r.slug, ownerRow._id))).toBe(400);
        expect(await status(staff.list(owner(), other.slug))).toBe(403); // Zed's restaurant
        expect(await status(staff.update(owner(), r.slug, "bad", {}))).toBe(400);
        expect(await status(staff.remove(owner(), r.slug, newId()))).toBe(404);
        expect((await staff.remove(owner(), r.slug, added!._id)).name).toBe("Robert");
        expect(await status(staff.list(owner(), "nope"))).toBe(404);
    });
});

describe("staff roles matched by email need a verified email (VM-13)", () => {
    // Bob is the bistro's cashier by email; his account isn't linked yet (no tenantId).
    async function bistroWithBob() {
        const s = setup();
        const r = await s.places.createForOwner("Bistro", { uid: "owner", email: "owner@x.test", name: "Ory" });
        await s.memberships.createMany([{ name: "Bob", tenantId: null, email: "bob@x.test", role: "cashier", resId: String(r._id) }]);
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
        expect(sneaky!.tenantId).toBeNull();
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

describe("changing a staff role can't duplicate it (VM-18)", () => {
    async function bistro() {
        const s = setup();
        const r = await s.places.createForOwner("Bistro", { uid: "owner", email: "owner@x.test", name: "Ory" });
        const other = await s.places.createForOwner("Other", { uid: "zed", email: "zed@x.test", name: "Zed" });
        const resId = String(r._id);
        const [cashier, chef] = await s.memberships.createMany([
            { name: "Bob", tenantId: "bob", email: "bob@x.test", role: "cashier", resId },
            { name: "Bob", tenantId: "bob", email: "bob@x.test", role: "chef", resId },
        ]);
        const by = { uid: "owner", email: "owner@x.test", role: "owner" as const };
        return { ...s, r, other, resId, cashier, chef, by };
    }

    it("changing Bob's chef row to cashier is a 409, and nothing changes", async () => {
        const { staff, memberships, r, chef, by } = await bistro();
        expect(await status(staff.update(by, r.slug, chef!._id, { role: "cashier" }))).toBe(409);
        expect(memberships.all.find((m) => m._id === chef!._id)?.role).toBe("chef");
    });

    it("the same account under another email counts as the same person", async () => {
        const { staff, memberships, r, resId, by } = await bistro();
        const [other] = await memberships.createMany([{ name: "Bob", tenantId: "bob2", email: "bob2@x.test", role: "chef", resId }]);
        await memberships.createMany([{ name: "Bob", tenantId: "bob2", email: "bob-work@x.test", role: "cashier", resId }]);
        expect(await status(staff.update(by, r.slug, other!._id, { role: "cashier" }))).toBe(409);
    });

    it("changing an email to someone who already has that role is a 409", async () => {
        const { staff, memberships, r, resId, by } = await bistro();
        const [dara] = await memberships.createMany([{ name: "Dara", tenantId: null, email: "dara@x.test", role: "cashier", resId }]);
        expect(await status(staff.update(by, r.slug, dara!._id, { email: "BOB@x.test" }))).toBe(409);
    });

    it("a role the person doesn't have yet is fine", async () => {
        const { staff, memberships, r, resId, by } = await bistro();
        const [dara] = await memberships.createMany([{ name: "Dara", tenantId: "dara", email: "dara@x.test", role: "chef", resId }]);
        expect((await staff.update(by, r.slug, dara!._id, { role: "cashier" })).role).toBe("cashier");
    });

    it("two different pending invites aren't the same person just because neither has an account", async () => {
        const { staff, memberships, r, resId, by } = await bistro();
        const [a] = await memberships.createMany([
            { name: "A", tenantId: null, email: "a@x.test", role: "chef", resId },
            { name: "B", tenantId: null, email: "b@x.test", role: "cashier", resId },
        ]);
        expect((await staff.update(by, r.slug, a!._id, { role: "cashier" })).role).toBe("cashier");
    });

    it("the same role at another restaurant doesn't count", async () => {
        const { staff, memberships, r, other, resId, by } = await bistro();
        await memberships.createMany([{ name: "Dara", tenantId: "dara", email: "dara@x.test", role: "cashier", resId: String(other._id) }]);
        const [dara] = await memberships.createMany([{ name: "Dara", tenantId: "dara", email: "dara@x.test", role: "chef", resId }]);
        expect((await staff.update(by, r.slug, dara!._id, { role: "cashier" })).role).toBe("cashier");
    });

    it("saving a row without changing its role still works, even if old data already has a duplicate", async () => {
        const { staff, memberships, r, resId, cashier, by } = await bistro();
        await memberships.createMany([{ name: "Bob", tenantId: "bob", email: "bob@x.test", role: "cashier", resId }]); // from before this fix
        expect((await staff.update(by, r.slug, cashier!._id, { name: "Robert", role: "cashier", email: "bob@x.test" })).name).toBe(
            "Robert",
        );
    });
});
