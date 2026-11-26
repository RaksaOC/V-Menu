import request from "supertest";
import { describe, expect, it } from "vitest";
import { signAppToken } from "@vmenu/common";
import { tokenFor } from "@vmenu/common/testing";
import { app, signUp, useRestaurantDb } from "./restaurant-app.js";

useRestaurantDb();

describe("restaurant settings (VM-24)", () => {
    it("anyone reads them; the owner changes them; they're kept", async () => {
        const slug = await signUp();
        const read = await request(app).get(`/api/restaurants/${slug}/settings`);
        expect(read.status).toBe(200);
        expect(read.body).toEqual({ name: "Mee Keav", currency: "USD", khrPerUsd: 4100, paymentQrUrl: null });
        const token = await signAppToken({ uid: "owner1", email: "owner@x.com", role: "owner" });
        const qr = `/api/menu/${slug}/images/${"c".repeat(24)}`;
        const saved = await request(app)
            .put(`/api/restaurants/${slug}/settings`)
            .set("authorization", `Bearer ${token}`)
            .send({ currency: "KHR", khrPerUsd: 4050, paymentQrUrl: qr });
        expect(saved.status).toBe(200);
        expect((await request(app).get(`/api/restaurants/${slug}/settings`)).body).toEqual({
            name: "Mee Keav",
            currency: "KHR",
            khrPerUsd: 4050,
            paymentQrUrl: qr,
        });
    });

    it("refuses another owner and a bad currency", async () => {
        const slug = await signUp("owner1", "a@x.com");
        await signUp("owner2", "b@x.com"); // a real owner, of another restaurant (SEC-03)
        const other = await signAppToken({ uid: "owner2", email: "b@x.com", role: "owner" });
        const mine = await signAppToken({ uid: "owner1", email: "a@x.com", role: "owner" });
        const put = (t: string, body: object) =>
            request(app).put(`/api/restaurants/${slug}/settings`).set("authorization", `Bearer ${t}`).send(body);
        expect((await put(other, { currency: "KHR" })).status).toBe(403);
        expect((await put(mine, { currency: "EUR" })).status).toBe(400);
    });
});

describe("owner routes", () => {
    it("keeps owners out of restaurants they do not own", async () => {
        const slug = await signUp("owner1", "a@x.com");
        await signUp("owner2", "b@x.com"); // a real owner, of another restaurant (SEC-03)
        const other = await signAppToken({ uid: "owner2", email: "b@x.com", role: "owner" });
        const res = await request(app).get(`/api/restaurants/${slug}/staff`).set("authorization", `Bearer ${other}`);
        expect(res.status).toBe(403);
    });

    it("adds, edits and removes a cashier", async () => {
        const slug = await signUp();
        const token = await signAppToken({ uid: "owner1", email: "owner@x.com", role: "owner" });
        const auth = { authorization: `Bearer ${token}` };
        const added = await request(app)
            .post(`/api/restaurants/${slug}/staff`)
            .set(auth)
            .send({ name: "Visal", email: "V@x.com", tenantId: "u9", role: "cashier" });
        expect(added.status).toBe(201);
        expect(added.body.email).toBe("v@x.com");
        const edited = await request(app).put(`/api/restaurants/${slug}/staff/${added.body._id}`).set(auth).send({ role: "chef" });
        expect(edited.body.role).toBe("chef");
        const promote = await request(app).put(`/api/restaurants/${slug}/staff/${added.body._id}`).set(auth).send({ role: "owner" });
        expect(promote.status).toBe(400);
        const removed = await request(app).delete(`/api/restaurants/${slug}/staff/${added.body._id}`).set(auth);
        expect(removed.status).toBe(200);
    });

    it("invites a cashier by email; their first verified sign-in links the account (VM-12)", async () => {
        const slug = await signUp();
        const auth = await tokenFor("owner", { ownerId: "owner1" });
        const invited = await request(app)
            .post(`/api/restaurants/${slug}/staff`)
            .set(auth)
            .send({ name: "Dara", email: "dara@x.com", role: "cashier" });
        expect(invited.status).toBe(201);
        expect(invited.body.tenantId).toBeNull();
        expect((await request(app).post("/api/auth/memberships").send({ idToken: "dara-uid:dara@x.com:unverified" })).body).toEqual({});
        const roles = await request(app).post("/api/auth/memberships").send({ idToken: "dara-uid:dara@x.com" });
        expect(roles.body).toEqual({ [`Mee Keav - ${slug}`]: ["cashier"] });
        const [linked] = (await request(app).get(`/api/restaurants/${slug}/staff`).set(auth)).body.filter(
            (m: { email: string }) => m.email === "dara@x.com",
        );
        expect(linked.tenantId).toBe("dara-uid");
    });

    it("changing a role into one the person already has here is a 409 (VM-18)", async () => {
        const slug = await signUp();
        const auth = await tokenFor("owner", { ownerId: "owner1" });
        const add = (role: string) =>
            request(app).post(`/api/restaurants/${slug}/staff`).set(auth).send({ name: "Sok", email: "sok@x.com", role });
        await add("cashier");
        const chef = await add("chef");
        const res = await request(app).put(`/api/restaurants/${slug}/staff/${chef.body._id}`).set(auth).send({ role: "cashier" });
        expect(res.status).toBe(409);
        expect(res.body.message).toBe("This person already has that role here");
        const rows = (await request(app).get(`/api/restaurants/${slug}/staff`).set(auth)).body.filter(
            (m: { email: string }) => m.email === "sok@x.com",
        );
        expect(rows.map((m: { role: string }) => m.role).sort()).toEqual(["cashier", "chef"]);
    });

    it("rejects a cashier token on owner routes", async () => {
        const token = await signAppToken({ uid: "u9", email: "v@x.com", role: "cashier" });
        const res = await request(app).get("/api/restaurants").set("authorization", `Bearer ${token}`);
        expect(res.status).toBe(403);
    });
});

describe("internal routes", () => {
    it("need the internal key", async () => {
        const slug = await signUp();
        expect((await request(app).get(`/internal/restaurants/by-slug/${slug}`)).status).toBe(401);
        const ok = await request(app).get(`/internal/restaurants/by-slug/${slug}`).set("x-internal-key", "internal-test-key");
        expect(ok.body).toMatchObject({ slug, ownerId: "owner1" });
    });
});

describe("public restaurant info (VM-21)", () => {
    it("needs no sign-in, and answers only the name and slug", async () => {
        const slug = await signUp();
        const res = await request(app).get(`/api/restaurants/${slug}/public`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ name: "Mee Keav", slug }); // no id, owner id or email
    });

    it("an unknown restaurant is a 404 with a code the page can explain", async () => {
        const res = await request(app).get("/api/restaurants/nobody-here/public");
        expect(res.status).toBe(404);
        expect(res.body.code).toBe("RESTAURANT_NOT_FOUND");
    });

    it("the owner's routes next to it still need a sign-in", async () => {
        const slug = await signUp();
        expect((await request(app).get(`/api/restaurants/${slug}/staff`)).status).toBe(401);
    });
});
