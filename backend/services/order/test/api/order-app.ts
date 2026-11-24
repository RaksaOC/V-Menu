// CL-14: the setup the order-service API tests share: one restaurant, one dish, stand-ins for
// restaurant-service and menu-service, an app, a database per test file, and signed-in staff.
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { HttpError } from "@vmenu/common";
import { fakeRestaurantLookup, startMemoryMongo, tokenFor } from "@vmenu/common/testing";
import { OrderCheckResponse } from "@vmenu/contracts";
import { createApp } from "../../src/app.js";
import type { Clients } from "../../src/clients/index.js";
import { Bill } from "../../src/models/bill.model.js";

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";

export const R = { _id: "665f00000000000000000001", name: "Mee Keav", slug: "mee-keav-abc123", ownerId: "owner1" };
export const ITEM = { _id: "665f0000000000000000aaaa", name: "Kuy Teav", priceCents: 250, image: "k.jpg", isEnabled: true };
let menuUp = true;
/** Takes menu-service down (503) until the next test. */
export const menuDown = () => {
    menuUp = false;
};

// Stand-ins for restaurant-service and menu-service.
export const clients: Clients = {
    listOwnerRestaurants: async (_req, ownerId) => (ownerId === "owner1" ? [R] : []),
    menuCounts: async () => ({ numOfTables: 4, numOfActiveTables: 2, numOfItems: 10 }),
    orderCheck: async (_req, _resId, body) => {
        if (!menuUp) throw new HttpError(503, "A required service is unavailable");
        if (body.table !== "1") throw new HttpError(409, "Table is not available");
        // The browser said the price was 0; the menu answers with the real one.
        return OrderCheckResponse.parse({ items: body.items.map((l) => ({ item: ITEM, quantity: l.quantity })) }); // CL-05
    },
    tableByToken: async () => ({ name: "1" }), // SEC-04
};
export const app = createApp({
    clients,
    lookupRestaurant: fakeRestaurantLookup([R]),
});

// Signed-in staff of R, set before the first test (ES module bindings are live).
export let chef: Record<string, string>, cashier: Record<string, string>, owner: Record<string, string>;

/** A fresh database for this test file, emptied before each test. Call once at the top of the file. */
export function useOrderDb() {
    let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
    beforeAll(async () => {
        mongo = await startMemoryMongo("orders");
        chef = await tokenFor("chef", R, { uid: "u1" });
        cashier = await tokenFor("cashier", R, { uid: "u2" });
        owner = await tokenFor("owner", { ownerId: "owner1" });
    });
    afterAll(async () => {
        await mongo.stop();
    });
    beforeEach(async () => {
        menuUp = true;
        await mongoose.connection.db!.dropDatabase();
        await Bill.createIndexes(); // dropDatabase drops them too
    });
}

/** VM-27: the kitchen takes an order to served, one step at a time (what "done" used to be). */
export async function serve(id: string) {
    let res;
    for (const status of ["preparing", "ready", "served"])
        res = await request(app).patch(`/api/orders/${R.slug}/kitchen/${id}/status`).set(chef).send({ status });
    return res!;
}

export const place = (table = "1", quantity = 2) =>
    request(app)
        .post(`/api/orders/${R.slug}`)
        .send({ table, orderedItems: [{ item: { _id: ITEM._id, priceCents: 0 }, quantity }] });
