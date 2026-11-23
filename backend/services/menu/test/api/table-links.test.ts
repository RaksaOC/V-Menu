import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prepareDatabase } from "../../src/db.js";
import { Table } from "../../src/models/table.model.js";
import { notFound, signAppToken } from "@vmenu/common";

// SEC-04: a table is opened through its own random link token, which the owner can replace.
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";

const SLUG = "mee-keav-abc123";
const OTHER = "other-xyz789";
const RESTAURANTS: Record<string, { _id: string; name: string; slug: string; ownerId: string }> = {
    [SLUG]: { _id: "665f00000000000000000001", name: "Mee Keav", slug: SLUG, ownerId: "owner1" },
    [OTHER]: { _id: "665f00000000000000000002", name: "Other", slug: OTHER, ownerId: "owner1" },
};
const app = createApp({
    lookupRestaurant: async (_req, slug) => {
        const r = RESTAURANTS[slug];
        if (!r) throw notFound("Restaurant not found");
        return r;
    },
});
const WRONG = "AAAAAAAAAAAAAAAAAAAAAA";
const PHOTO = `/api/menu/${SLUG}/images/${"a".repeat(24)}`;

let mongo: MongoMemoryServer;
let owner: Record<string, string>;
const saved = process.env.ALLOW_TABLE_NAME_LINKS;
beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri("menu"));
    owner = { authorization: `Bearer ${await signAppToken({ uid: "owner1", email: "o@x.com", role: "owner" })}` };
});
afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});
beforeEach(async () => {
    delete process.env.ALLOW_TABLE_NAME_LINKS; // the setting a server has
    await mongoose.connection.db!.dropDatabase();
    await prepareDatabase();
});
afterEach(() => {
    if (saved === undefined) delete process.env.ALLOW_TABLE_NAME_LINKS;
    else process.env.ALLOW_TABLE_NAME_LINKS = saved;
});

async function addTable(name: string, slug = SLUG, open = true) {
    const { body } = await request(app).post(`/api/menu/${slug}/tables`).set(owner).send({ type: "manual", name });
    if (open) await request(app).patch(`/api/menu/${slug}/tables/${body._id}/availability`).set(owner).send({ isEnabled: true });
    return body as { _id: string; name: string; qrToken: string };
}
const byToken = (token: string, slug = SLUG) => request(app).get(`/api/menu/${slug}/public/t/${token}`);
const check = (body: object) =>
    request(app).post(`/internal/restaurants/${RESTAURANTS[SLUG]._id}/order-check`).set("x-internal-key", "internal-test-key").send(body);

describe("a table's link token (SEC-04)", () => {
    it("every table gets its own random token", async () => {
        const a = await addTable("A1");
        const b = await addTable("B1");
        expect(a.qrToken).toMatch(/^[A-Za-z0-9_-]{22}$/);
        expect(b.qrToken).toMatch(/^[A-Za-z0-9_-]{22}$/);
        expect(a.qrToken).not.toBe(b.qrToken);
    });

    it("a valid token answers only the table's name and whether it's open", async () => {
        const open = await addTable("A1");
        const closed = await addTable("B1", SLUG, false);
        expect((await byToken(open.qrToken)).body).toEqual({ table: "A1", isOpen: true });
        expect((await byToken(closed.qrToken)).body).toEqual({ table: "B1", isOpen: false });
    });

    it.each([
        ["a wrong token", WRONG],
        ["a malformed token", "nope"],
    ])("%s gets 404", async (_what, token) => {
        await addTable("A1");
        const res = await byToken(token);
        expect(res.status).toBe(404);
        expect(res.body.code).toBe("TABLE_LINK_INVALID");
    });

    it("another restaurant's token gets 404", async () => {
        const theirs = await addTable("A1", OTHER);
        expect((await byToken(theirs.qrToken)).status).toBe(404);
    });

    it("resetting gives a new token: the old one gets 404, the new one works", async () => {
        const table = await addTable("A1");
        const reset = await request(app).post(`/api/menu/${SLUG}/tables/${table._id}/qr-token`).set(owner);
        expect(reset.status).toBe(200);
        expect(reset.body.qrToken).not.toBe(table.qrToken);
        expect((await byToken(table.qrToken)).status).toBe(404);
        expect((await byToken(reset.body.qrToken)).body).toEqual({ table: "A1", isOpen: true });
    });

    it("resetting another restaurant's table is 404, and it keeps its token", async () => {
        const theirs = await addTable("A1", OTHER);
        expect((await request(app).post(`/api/menu/${SLUG}/tables/${theirs._id}/qr-token`).set(owner)).status).toBe(404);
        expect((await byToken(theirs.qrToken, OTHER)).status).toBe(200);
    });

    it("renaming a table keeps its token, so printed codes keep working", async () => {
        const table = await addTable("A1");
        await request(app).put(`/api/menu/${SLUG}/tables/${table._id}`).set(owner).send({ name: "Patio" });
        expect((await byToken(table.qrToken)).body).toEqual({ table: "Patio", isOpen: true });
    });

    it("the public menu never carries a token", async () => {
        const table = await addTable("A1");
        await request(app).post(`/api/menu/${SLUG}/items`).set(owner).send({ name: "Amok", price: 5, image: PHOTO });
        expect(JSON.stringify((await request(app).get(`/api/menu/${SLUG}/public/items`)).body)).not.toContain(table.qrToken);
    });

    it("at startup, tables from before get a token, and existing tokens are kept", async () => {
        const resId = RESTAURANTS[SLUG]._id;
        const kept = await addTable("A1");
        await Table.collection.insertMany([
            { name: "old-1", resId, isEnabled: true },
            { name: "old-2", resId, isEnabled: true },
        ]);
        await prepareDatabase();
        const all = await Table.find({ resId }).lean<{ name: string; qrToken: string }[]>();
        expect(all.find((t) => t.name === "A1")!.qrToken).toBe(kept.qrToken);
        expect(new Set(all.map((t) => t.qrToken)).size).toBe(3);
        for (const t of all) expect(t.qrToken).toMatch(/^[A-Za-z0-9_-]{22}$/);
    });
});

describe("table links by name are a setting, off by default (SEC-04)", () => {
    const byName = (name: string) => request(app).get(`/api/menu/${SLUG}/public/tables/${name}`);

    it("off: a real name and an unknown name get the very same answer", async () => {
        await addTable("A1");
        const real = await byName("A1");
        const unknown = await byName("Z9");
        expect(real.status).toBe(404);
        expect(real.body.code).toBe("TABLE_LINK_INVALID");
        expect(unknown.body).toEqual(real.body);
    });

    it("on, for local testing: it works as before", async () => {
        process.env.ALLOW_TABLE_NAME_LINKS = "true";
        await addTable("A1");
        expect((await byName("A1")).status).toBe(200);
    });
});

describe("the order check by token (SEC-04)", () => {
    async function dish() {
        const { body } = await request(app).post(`/api/menu/${SLUG}/items`).set(owner).send({ name: "Amok", price: 5, image: PHOTO });
        return [{ _id: body._id as string, quantity: 1 }];
    }

    it("a valid token works, and the answer names the table", async () => {
        const table = await addTable("A1");
        const res = await check({ qrToken: table.qrToken, items: await dish() });
        expect(res.status).toBe(200);
        expect(res.body.table).toBe("A1");
    });

    it("a wrong or old token gets 404", async () => {
        const table = await addTable("A1");
        const items = await dish();
        expect((await check({ qrToken: WRONG, items })).status).toBe(404);
        await request(app).post(`/api/menu/${SLUG}/tables/${table._id}/qr-token`).set(owner);
        const old = await check({ qrToken: table.qrToken, items });
        expect(old.status).toBe(404);
        expect(old.body.code).toBe("TABLE_LINK_INVALID");
    });

    it("a closed table is still refused", async () => {
        const table = await addTable("B1", SLUG, false);
        const res = await check({ qrToken: table.qrToken, items: await dish() });
        expect(res.status).toBe(409);
        expect(res.body.code).toBe("TABLE_CLOSED");
    });

    it("the internal lookup answers the name, or 404", async () => {
        const table = await addTable("A1");
        const url = (t: string) => `/internal/restaurants/${RESTAURANTS[SLUG]._id}/tables/by-token/${t}`;
        const found = await request(app).get(url(table.qrToken)).set("x-internal-key", "internal-test-key");
        expect(found.body).toEqual({ name: "A1" });
        expect((await request(app).get(url(WRONG)).set("x-internal-key", "internal-test-key")).status).toBe(404);
    });
});
