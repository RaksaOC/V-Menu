import { HttpError, notFound } from "@vmenu/common";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Clients } from "../../src/clients/index.js";
import { createApp } from "../../src/app.js";
import { Order } from "../../src/models/order.model.js";

// SEC-04: customers order and read their table through its link token. menu-service owns the
// tokens; here it's a stand-in that knows one token, for table "T1".
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
const SLUG = "rest-a";
const RES = { _id: "665f00000000000000000001", name: "A", slug: SLUG, ownerId: "owner-a" };
const TOKEN = "AbCdEfGhIjKlMnOpQrSt_-";
const WRONG = "AAAAAAAAAAAAAAAAAAAAAA";
const DISH = { _id: "665f0000000000000000aaaa", name: "Kuy Teav", price: 2.5, image: "k.jpg", isEnabled: true };
const invalid = () => new HttpError(404, "This table link isn't valid.", "TABLE_LINK_INVALID");

const clients: Clients = {
    listOwnerRestaurants: async () => [RES],
    menuCounts: async () => ({ numOfTables: 1, numOfActiveTables: 1, numOfItems: 1 }),
    orderCheck: async (_req, _resId, body) => {
        if (body.qrToken && body.qrToken !== TOKEN) throw invalid();
        return { table: body.table ?? "T1", items: body.items.map((l) => ({ item: DISH, quantity: l.quantity })) };
    },
    tableByToken: async (_req, _resId, token) => {
        if (token !== TOKEN) throw invalid();
        return { name: "T1" };
    },
};
const app = createApp({
    clients,
    lookupRestaurant: async (_req, slug) => {
        if (slug !== SLUG) throw notFound("Restaurant not found");
        return RES;
    },
});

let mongo: MongoMemoryServer;
const saved = process.env.ALLOW_TABLE_NAME_LINKS;
beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri("order-links"));
});
afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});
beforeEach(async () => {
    delete process.env.ALLOW_TABLE_NAME_LINKS; // the setting a server has
    await mongoose.connection.db!.dropDatabase();
});
afterEach(() => {
    if (saved === undefined) delete process.env.ALLOW_TABLE_NAME_LINKS;
    else process.env.ALLOW_TABLE_NAME_LINKS = saved;
});

const lines = [{ item: { _id: DISH._id }, quantity: 2 }];
const place = (body: object) => request(app).post(`/api/orders/${SLUG}`).send(body);

describe("ordering with a table's link token (SEC-04)", () => {
    it("a valid token places the order at the table menu-service names", async () => {
        const res = await place({ qrToken: TOKEN, orderedItems: lines });
        expect(res.status).toBe(201);
        expect(res.body.table).toBe("T1");
    });

    it("a wrong or old token gets 404, and no order is saved", async () => {
        const res = await place({ qrToken: WRONG, orderedItems: lines });
        expect(res.status).toBe(404);
        expect(res.body.code).toBe("TABLE_LINK_INVALID");
        expect(await Order.countDocuments()).toBe(0);
    });

    it("a table name is refused while the setting is off, and no order is saved", async () => {
        const res = await place({ table: "T1", orderedItems: lines });
        expect(res.status).toBe(404);
        expect(res.body.code).toBe("TABLE_LINK_INVALID");
        expect(await Order.countDocuments()).toBe(0);
    });

    it("a table name works with the setting on, for local testing", async () => {
        process.env.ALLOW_TABLE_NAME_LINKS = "true";
        expect((await place({ table: "T1", orderedItems: lines })).status).toBe(201);
    });
});

describe("reading a table's orders with its link token (SEC-04)", () => {
    const viaToken = (path: string, token = TOKEN) => request(app).get(`/api/orders/${SLUG}/t/${token}${path}`);

    it("shows that table's order and open bill", async () => {
        const { body: order } = await place({ qrToken: TOKEN, orderedItems: lines });
        expect((await viaToken(`/orders/${order._id}`)).body).toMatchObject({ _id: order._id, table: "T1", total: 5 });
        expect((await viaToken("/open-bill")).body).toMatchObject({ table: "T1", total: 5 });
    });

    it("a wrong token gets 404 for both", async () => {
        const { body: order } = await place({ qrToken: TOKEN, orderedItems: lines });
        for (const path of [`/orders/${order._id}`, "/open-bill"]) {
            const res = await viaToken(path, WRONG);
            expect(res.status).toBe(404);
            expect(res.body.code).toBe("TABLE_LINK_INVALID");
        }
    });

    it("another table's order gets 404", async () => {
        process.env.ALLOW_TABLE_NAME_LINKS = "true";
        const { body: other } = await place({ table: "T2", orderedItems: lines });
        expect((await viaToken(`/orders/${other._id}`)).status).toBe(404);
    });

    it("the routes by table name are refused while the setting is off", async () => {
        const { body: order } = await place({ qrToken: TOKEN, orderedItems: lines });
        for (const path of [`/orders/${order._id}`, "/open-bill"]) {
            const res = await request(app).get(`/api/orders/${SLUG}/tables/T1${path}`);
            expect(res.status).toBe(404);
            expect(res.body.code).toBe("TABLE_LINK_INVALID");
        }
    });
});
