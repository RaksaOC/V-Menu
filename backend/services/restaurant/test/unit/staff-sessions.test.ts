import { afterEach, describe, expect, it, vi } from "vitest";
import { owner, setup, status, ALICE } from "./services-setup.js";

// VM-12 and SEC-03 (review follow-up): a staff row belongs to one person. Changing its email hands
// it to the new email as a fresh invite, and a row added again never brings an older session back.
async function bistroWithBob() {
    const s = setup();
    const r = await s.places.createForOwner("Mee Keav", { ...ALICE, name: "Alice" });
    const added = await s.staff.add(owner(), r.slug, { name: "Bob", email: "bob@x.test", role: "cashier" });
    await s.auth.memberships({ idToken: "id:bob-uid:bob@x.test" }); // Bob signs in: the invite links to his account
    const resId = String(r._id);
    const version = (uid: string) => s.memberships.sessionVersion(uid, "cashier", resId);
    return { ...s, r, resId, id: added!._id, version };
}
const bobLogin = (s: Awaited<ReturnType<typeof bistroWithBob>>, idToken = "id:bob-uid:bob@x.test") =>
    status(s.auth.login({ idToken, role: "cashier", resSlug: s.r.slug }));

describe("changing a linked staff member's email (VM-12, SEC-03)", () => {
    it("unlinks the row and ends the old account's sessions", async () => {
        const s = await bistroWithBob();
        const before = (await s.version("bob-uid"))!;
        const edited = await s.staff.update(owner(), s.r.slug, s.id, { email: "carol@x.test" });
        expect(edited).toMatchObject({ email: "carol@x.test", tenantId: null });
        expect(s.memberships.all.find((t) => t._id === s.id)!.tokenVersion).toBeGreaterThan(before);
        expect(await s.version("bob-uid")).toBeNull(); // every token Bob holds for this role stops working
        expect(await bobLogin(s)).toBe(401);
    });

    it("the row becomes an invite for the new email: its first verified sign-in links it", async () => {
        const s = await bistroWithBob();
        await s.staff.update(owner(), s.r.slug, s.id, { email: "carol@x.test" });
        expect(await bobLogin(s, "id:carol-uid:carol@x.test")).toBe(200);
        expect(s.memberships.all.find((t) => t._id === s.id)!.tenantId).toBe("carol-uid");
    });

    it("changing only the name or the role keeps the row with its account", async () => {
        const s = await bistroWithBob();
        await s.staff.update(owner(), s.r.slug, s.id, { name: "Robert", email: "bob@x.test" });
        expect(s.memberships.all.find((t) => t._id === s.id)!.tenantId).toBe("bob-uid");
        expect(await bobLogin(s)).toBe(200);
    });

    it("a pending invite's email can be corrected; there's no account to unlink", async () => {
        const s = setup();
        const r = await s.places.createForOwner("Mee Keav", { ...ALICE, name: "Alice" });
        const added = await s.staff.add(owner(), r.slug, { name: "Bob", email: "bob@x.tset", role: "chef" });
        const edited = await s.staff.update(owner(), r.slug, added!._id, { email: "bob@x.test" });
        expect(edited).toMatchObject({ email: "bob@x.test", tenantId: null });
    });

    it("still refuses an email that already has this role here (VM-18)", async () => {
        const s = await bistroWithBob();
        await s.staff.add(owner(), s.r.slug, { name: "Carol", email: "carol@x.test", role: "cashier" });
        expect(await status(s.staff.update(owner(), s.r.slug, s.id, { email: "carol@x.test" }))).toBe(409);
        expect(s.memberships.all.find((t) => t._id === s.id)!.tenantId).toBe("bob-uid");
    });
});

describe("a new or re-invited row never restarts at version 0 (SEC-03)", () => {
    it("an invite starts above any version issued so far", async () => {
        const s = setup();
        const r = await s.places.createForOwner("Mee Keav", { ...ALICE, name: "Alice" });
        const startedAt = Date.now();
        const added = await s.staff.add(owner(), r.slug, { name: "Bob", email: "bob@x.test", role: "chef" });
        expect(added!.tokenVersion).toBeGreaterThanOrEqual(startedAt);
    });

    afterEach(() => vi.useRealTimers());

    it("someone removed and invited again doesn't get their old version back", async () => {
        vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-24T09:00:00Z") });
        const s = await bistroWithBob();
        await s.auth.signOutEverywhere("bob-uid");
        const ended = (await s.version("bob-uid"))!; // tokens up to this one are ended or still current
        vi.setSystemTime(new Date("2026-11-24T09:05:00Z")); // the owner removes Bob, and later invites him again
        await s.staff.remove(owner(), s.r.slug, s.id);
        await s.staff.add(owner(), s.r.slug, { name: "Bob", email: "bob@x.test", role: "cashier" });
        await s.auth.memberships({ idToken: "id:bob-uid:bob@x.test" });
        expect((await s.version("bob-uid"))!).toBeGreaterThan(ended);
    });

    it("a new restaurant doesn't change the owner's current version, so they stay signed in", async () => {
        const s = setup();
        await s.places.createForOwner("Mee Keav", { ...ALICE, name: "Alice" });
        const before = await s.memberships.sessionVersion("alice", "owner");
        await s.places.create(owner(), { name: "Second place" });
        expect(await s.memberships.sessionVersion("alice", "owner")).toBe(before);
    });
});
