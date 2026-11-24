// CL-14: the shared test helpers work as the services' tests expect.
import mongoose from "mongoose";
import { afterAll, describe, expect, it } from "vitest";
import { decodeJwt } from "jose";
import { HttpError } from "../src/errors.js";
import { fakeRestaurantLookup, startMemoryMongo, tokenFor } from "../src/testing.js";

process.env.JWT_SECRET ??= "test-secret-test-secret-test-secret-123";

const A = { _id: "665f00000000000000000001", slug: "mee-keav", ownerId: "owner-a" };

describe("startMemoryMongo", () => {
    let stop: (() => Promise<void>) | undefined;
    afterAll(async () => stop?.());

    it("connects mongoose to a database of its own", async () => {
        const mongo = await startMemoryMongo("helpers");
        stop = mongo.stop;
        expect(mongoose.connection.readyState).toBe(1);
        expect(mongo.uri).toMatch(/\/helpers-/);
        await mongoose.connection.db!.collection("x").insertOne({ a: 1 });
        expect(await mongoose.connection.db!.collection("x").countDocuments()).toBe(1);
        await mongo.stop();
        stop = undefined;
        expect(mongoose.connection.readyState).toBe(0);
    });
});

describe("tokenFor", () => {
    const claims = async (h: { authorization: string }) => decodeJwt(h.authorization.replace("Bearer ", ""));

    it("an owner is the restaurant's owner", async () => {
        expect(await claims(await tokenFor("owner", A))).toMatchObject({ uid: "owner-a", role: "owner" });
    });

    it("staff belong to the restaurant, and any claim can be set", async () => {
        const c = await claims(await tokenFor("cashier", A, { uid: "c1", tv: 2 }));
        expect(c).toMatchObject({ uid: "c1", role: "cashier", resId: A._id, resSlug: A.slug, tv: 2 });
    });
});

describe("fakeRestaurantLookup", () => {
    it("answers by slug, from a list or a map, and 404 for others", async () => {
        expect(await fakeRestaurantLookup([A])(null, "mee-keav")).toBe(A);
        expect(await fakeRestaurantLookup({ a: A })(null, "mee-keav")).toBe(A);
        const err = await fakeRestaurantLookup([A])(null, "nope").catch((e: HttpError) => e);
        expect((err as HttpError).status).toBe(404);
    });

    it("says 503 while restaurant-service is down", async () => {
        let down = true;
        const lookup = fakeRestaurantLookup([A], { down: () => down });
        expect(((await lookup(null, "mee-keav").catch((e: HttpError) => e)) as HttpError).status).toBe(503);
        down = false;
        expect(await lookup(null, "mee-keav")).toBe(A);
    });
});
