import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { notFound, signAppToken } from "@vmenu/common";
import { NO_OPEN_BILLS } from "../unit/fakes.js";
import { createApp } from "../../src/app.js";
import { prepareDatabase } from "../../src/db.js";
import { Table } from "../../src/models/table.model.js";

// VM-16: two tables of one restaurant can never share a name, even when two requests arrive at
// the same moment. The database has the final say (a unique index), not a check before the insert.
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";

const SLUG = "mee-keav-abc123";
const OTHER = "other-xyz789";
const RESTAURANTS: Record<string, { _id: string; name: string; slug: string; ownerId: string }> = {
    [SLUG]: { _id: "665f00000000000000000001", name: "Mee Keav", slug: SLUG, ownerId: "owner1" },
    [OTHER]: { _id: "665f00000000000000000002", name: "Other", slug: OTHER, ownerId: "owner1" },
};
const app = createApp({
    openBills: () => NO_OPEN_BILLS, // VM-15: order-service, mocked
    lookupRestaurant: async (_req, slug) => {
        const r = RESTAURANTS[slug];
        if (!r) throw notFound("Restaurant not found");
        return r;
    },
});

let mongo: MongoMemoryServer;
let owner: Record<string, string>;
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
    await mongoose.connection.db!.dropDatabase();
    expect((await prepareDatabase()).tableNameIndex).toBe(true); // dropping the database drops the indexes; the service builds them at startup
});

const create = (body: object, slug = SLUG) => request(app).post(`/api/menu/${slug}/tables`).set(owner).send(body);
const names = async (slug = SLUG) =>
    (await request(app).get(`/api/menu/${slug}/tables`).set(owner)).body.map((t: { name: string }) => t.name).sort();

describe("table names are unique per restaurant (VM-16)", () => {
    it("5 automatic creates at the same time get 5 different names", async () => {
        const answers = await Promise.all(Array.from({ length: 5 }, () => create({})));
        expect(answers.map((r) => r.status)).toEqual([201, 201, 201, 201, 201]);
        expect(await names()).toEqual(["1", "2", "3", "4", "5"]);
    });

    it("the same manual name sent twice at once: one is created, the other gets 409", async () => {
        const answers = await Promise.all([create({ type: "manual", name: "Patio" }), create({ type: "manual", name: "Patio" })]);
        expect(answers.map((r) => r.status).sort()).toEqual([201, 409]);
        const refused = answers.find((r) => r.status === 409)!;
        expect(refused.body).toMatchObject({ code: "NAME_TAKEN", fields: { name: "Name is taken" } });
        expect(await names()).toEqual(["Patio"]);
    });

    it("a taken name is 409, for a new table and for a rename", async () => {
        await create({ type: "manual", name: "Patio" });
        const { body: window } = await create({ type: "manual", name: "Window" });
        expect((await create({ type: "manual", name: "Patio" })).status).toBe(409);
        const rename = await request(app).put(`/api/menu/${SLUG}/tables/${window._id}`).set(owner).send({ name: "Patio" });
        expect(rename.status).toBe(409);
        expect(rename.body.code).toBe("NAME_TAKEN");
    });

    it("another restaurant may use the same name", async () => {
        await create({ type: "manual", name: "Patio" });
        expect((await create({ type: "manual", name: "Patio" }, OTHER)).status).toBe(201);
        expect((await create({}, OTHER)).body.name).toBe("1");
    });

    it("the database itself refuses a second table with the same name", async () => {
        await Table.create({ name: "7", resId: RESTAURANTS[SLUG]!._id });
        await expect(Table.create({ name: "7", resId: RESTAURANTS[SLUG]!._id })).rejects.toMatchObject({ code: 11000 });
    });

    it("the repository passes other database errors on unchanged", async () => {
        const { mongoTablesRepo, TableNameTaken } = await import("../../src/repositories/tables.repo.js");
        const resId = RESTAURANTS[SLUG]!._id;
        const t = await mongoTablesRepo.create(resId, { name: "1", isEnabled: false });
        const tooLong = mongoTablesRepo.update(resId, String(t._id), { name: "x".repeat(41) });
        await expect(tooLong).rejects.toBeInstanceOf(mongoose.Error.ValidationError);
        await expect(mongoTablesRepo.create(resId, { name: "1", isEnabled: false })).rejects.toBeInstanceOf(TableNameTaken);
    });

    it("at startup, tables that already share a name are reported and the service keeps going", async () => {
        await mongoose.connection.db!.dropDatabase();
        const resId = RESTAURANTS[SLUG]!._id;
        await Table.collection.insertMany([
            { name: "4", resId },
            { name: "4", resId },
        ]);
        expect((await prepareDatabase()).tableNameIndex).toBe(false);
        await Table.deleteOne({ name: "4" });
        expect((await prepareDatabase()).tableNameIndex).toBe(true);
    });
});
