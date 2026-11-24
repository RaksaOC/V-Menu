import mongoose from "mongoose";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError, notFound } from "@vmenu/common";
import { fakeRestaurantLookup, startMemoryMongo } from "@vmenu/common/testing";
import { createApp } from "../../src/app.js";
import type { Clients } from "../../src/clients/index.js";
import { Bill } from "../../src/models/bill.model.js";
import { Order } from "../../src/models/order.model.js";

// VM-22: limits on placing orders, per client and per table, and on the size of one order.
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";

const A = { _id: "665f00000000000000000001", name: "A", slug: "rest-a", ownerId: "owner1" };
const B = { _id: "665f00000000000000000002", name: "B", slug: "rest-b", ownerId: "owner2" };
const ITEM = { _id: "665f0000000000000000aaaa", name: "Kuy Teav", priceCents: 250, image: "k.jpg", isEnabled: true };
let closedTable: string | null = null;
/** SEC-04: table link tokens (22 characters) and the table each one opens. */
const T1 = "t1".padEnd(22, "a");
const T2 = "t2".padEnd(22, "b");
const LINKS: Record<string, string> = { [T1]: "1", [T2]: "2" };

const clients: Clients = {
    listOwnerRestaurants: async () => [],
    menuCounts: async () => ({ numOfTables: 1, numOfActiveTables: 1, numOfItems: 1 }),
    orderCheck: async (_req, _resId, body) => {
        const table = body.qrToken ? LINKS[body.qrToken] : body.table;
        if (!table) throw notFound("No such table link");
        if (table === closedTable) throw new HttpError(409, "Table is not available", "TABLE_CLOSED");
        return { ...(body.qrToken && { table }), items: body.items.map((l) => ({ item: ITEM, quantity: l.quantity })) };
    },
    tableByToken: async () => {
        throw notFound("No such table link"); // VM-22: these tests order by table name
    },
};
const lookupRestaurant = fakeRestaurantLookup([A, B]);
const appWith = (orderLimits?: { perMinute: number; perTable: number }) => createApp({ clients, lookupRestaurant, orderLimits });

type App = ReturnType<typeof createApp>;
const ip = (n: number) => `203.0.113.${n}`;
const order = (app: App, from: string, { table = "1", slug = A.slug, lines = 1 } = {}) =>
    request(app)
        .post(`/api/orders/${slug}`)
        .set("X-Forwarded-For", from)
        .send({ table, orderedItems: Array.from({ length: lines }, () => ({ item: { _id: ITEM._id }, quantity: 1 })) });
/** An order from a table's QR link (SEC-04): the body has the link's token and no table name. */
const orderByLink = (app: App, from: string, qrToken: string) =>
    request(app)
        .post(`/api/orders/${A.slug}`)
        .set("X-Forwarded-For", from)
        .send({ qrToken, orderedItems: [{ item: { _id: ITEM._id }, quantity: 1 }] });
/** How many orders the limits have refused so far (B10), from /metrics. */
const refusedSoFar = async (app: App) => {
    const res = await request(app).get("/metrics");
    const line = res.text.split("\n").find((l) => l.startsWith("vmenu_orders_rate_limited_total "));
    return line ? Number(line.split(" ").pop()) : 0;
};

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
beforeAll(async () => {
    mongo = await startMemoryMongo("order-limits");
});
afterAll(async () => {
    await mongo.stop();
});
beforeEach(async () => {
    closedTable = null;
    await mongoose.connection.db!.dropDatabase();
    await Bill.createIndexes();
});
afterEach(() => vi.unstubAllEnvs());

describe("orders per client (VM-22)", () => {
    it("the 11th order within a minute gets 429 with a friendly message, and isn't saved", async () => {
        const app = appWith({ perMinute: 10, perTable: 1000 });
        for (let i = 0; i < 10; i++) expect((await order(app, ip(1))).status).toBe(201);
        const refused = await order(app, ip(1));
        expect(refused.status).toBe(429);
        expect(refused.body.code).toBe("TOO_MANY_ORDERS");
        expect(refused.body.message).toMatch(/wait a minute/i);
        expect(Number(refused.headers["retry-after"])).toBeGreaterThan(0);
        expect(await Order.countDocuments()).toBe(10);
    });

    it("another client has its own count", async () => {
        const app = appWith({ perMinute: 2, perTable: 1000 });
        await order(app, ip(1));
        await order(app, ip(1));
        expect((await order(app, ip(1))).status).toBe(429);
        expect((await order(app, ip(2))).status).toBe(201);
    });

    it("the count starts again after the minute", async () => {
        vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-24T10:00:00Z") });
        try {
            const app = appWith({ perMinute: 1, perTable: 1000 });
            expect((await order(app, ip(1))).status).toBe(201);
            expect((await order(app, ip(1))).status).toBe(429);
            vi.setSystemTime(new Date("2026-11-24T10:01:01Z"));
            expect((await order(app, ip(1))).status).toBe(201);
        } finally {
            vi.useRealTimers();
        }
    });
});

describe("orders per table (VM-22)", () => {
    it("the 31st order on a table within 10 minutes gets 429, whoever sends it; another table is fine", async () => {
        const app = appWith({ perMinute: 1000, perTable: 30 });
        for (let i = 0; i < 30; i++) expect((await order(app, ip(i + 1))).status).toBe(201);
        const refused = await order(app, ip(99));
        expect(refused.status).toBe(429);
        expect(refused.body.code).toBe("TOO_MANY_ORDERS");
        expect(refused.body.message).toMatch(/staff/i);
        expect((await order(app, ip(99), { table: "2" })).status).toBe(201);
    });

    it("writes of one table name count as the same table", async () => {
        const app = appWith({ perMinute: 1000, perTable: 1 });
        expect((await order(app, ip(1), { table: "7" })).status).toBe(201);
        expect((await order(app, ip(2), { table: " 7 " })).status).toBe(429);
    });

    it("the same table name in another restaurant has its own count", async () => {
        const app = appWith({ perMinute: 1000, perTable: 1 });
        expect((await order(app, ip(1))).status).toBe(201);
        expect((await order(app, ip(2), { slug: B.slug })).status).toBe(201);
    });

    it("orders that were refused don't use up the table's count", async () => {
        const app = appWith({ perMinute: 1000, perTable: 2 });
        closedTable = "1";
        for (let i = 0; i < 3; i++) expect((await order(app, ip(i + 1))).status).toBe(409);
        closedTable = null;
        expect((await order(app, ip(4))).status).toBe(201);
        expect((await order(app, ip(5))).status).toBe(201);
        expect((await order(app, ip(6))).status).toBe(429);
    });
});

describe("orders from a table's QR link (VM-22, SEC-04)", () => {
    it("each table has its own count: two tables can each place their full quota", async () => {
        const app = appWith({ perMinute: 1000, perTable: 3 });
        for (let i = 0; i < 3; i++) expect((await orderByLink(app, ip(i + 1), T1)).status).toBe(201);
        for (let i = 0; i < 3; i++) expect((await orderByLink(app, ip(i + 10), T2)).status).toBe(201);
        expect(await Order.countDocuments({ table: "1" })).toBe(3);
        expect(await Order.countDocuments({ table: "2" })).toBe(3);
    });

    it("one table at its limit doesn't block another table", async () => {
        const app = appWith({ perMinute: 1000, perTable: 1 });
        expect((await orderByLink(app, ip(1), T1)).status).toBe(201);
        const refused = await orderByLink(app, ip(2), T1);
        expect(refused.status).toBe(429);
        expect(refused.body.message).toMatch(/staff/i);
        expect((await orderByLink(app, ip(3), T2)).status).toBe(201);
    });

    it("a link that opens no table doesn't use up anyone's count", async () => {
        const app = appWith({ perMinute: 1000, perTable: 1 });
        expect((await orderByLink(app, ip(1), "zz".padEnd(22, "z"))).status).toBe(404);
        expect((await orderByLink(app, ip(2), T1)).status).toBe(201);
    });
});

describe("refused orders on /metrics (VM-22, B10)", () => {
    it("vmenu_orders_rate_limited_total counts orders refused by the per-table limit", async () => {
        const app = appWith({ perMinute: 1000, perTable: 1 });
        const before = await refusedSoFar(app);
        expect((await orderByLink(app, ip(1), T1)).status).toBe(201);
        expect((await orderByLink(app, ip(2), T1)).status).toBe(429);
        expect((await order(app, ip(3), { table: "5" })).status).toBe(201);
        expect((await order(app, ip(4), { table: "5" })).status).toBe(429);
        expect(await refusedSoFar(app)).toBe(before + 2);
    });

    it("and orders refused by the per-client limit", async () => {
        const app = appWith({ perMinute: 1, perTable: 1000 });
        const before = await refusedSoFar(app);
        expect((await order(app, ip(1))).status).toBe(201);
        expect((await order(app, ip(1))).status).toBe(429);
        expect(await refusedSoFar(app)).toBe(before + 1);
    });

    it("a placed order isn't counted", async () => {
        const app = appWith({ perMinute: 1000, perTable: 1000 });
        const before = await refusedSoFar(app);
        expect((await order(app, ip(1))).status).toBe(201);
        expect(await refusedSoFar(app)).toBe(before);
    });
});

describe("the limits' settings (VM-22)", () => {
    it("are 10 a minute per client when nothing is set", async () => {
        vi.stubEnv("ORDERS_PER_MINUTE", "");
        vi.stubEnv("ORDERS_PER_TABLE", "");
        const app = appWith();
        for (let i = 0; i < 10; i++) expect((await order(app, ip(1))).status).toBe(201);
        expect((await order(app, ip(1))).status).toBe(429);
    });

    it("are 30 per table when nothing is set", async () => {
        vi.stubEnv("ORDERS_PER_MINUTE", "");
        vi.stubEnv("ORDERS_PER_TABLE", "");
        const app = appWith();
        for (let i = 0; i < 30; i++) expect((await order(app, ip(i + 1))).status).toBe(201);
        expect((await order(app, ip(99))).status).toBe(429);
    });

    it("a setting that isn't a positive whole number falls back to the default", async () => {
        vi.stubEnv("ORDERS_PER_MINUTE", "lots");
        vi.stubEnv("ORDERS_PER_TABLE", "0");
        const app = appWith();
        for (let i = 0; i < 10; i++) expect((await order(app, ip(1))).status).toBe(201);
        expect((await order(app, ip(1))).status).toBe(429);
    });

    it("can be changed with the environment", async () => {
        vi.stubEnv("ORDERS_PER_MINUTE", "1");
        vi.stubEnv("ORDERS_PER_TABLE", "1000");
        const app = appWith();
        expect((await order(app, ip(1))).status).toBe(201);
        expect((await order(app, ip(1))).status).toBe(429);
    });
});

describe("the size of one order (VM-22)", () => {
    it("takes 50 lines and refuses 51 with a 400 that names the field", async () => {
        const app = appWith({ perMinute: 1000, perTable: 1000 });
        expect((await order(app, ip(1), { lines: 50 })).status).toBe(201);
        const refused = await order(app, ip(1), { lines: 51 });
        expect(refused.status).toBe(400);
        expect(refused.body.fields.orderedItems).toBe("At most 50 lines");
    });
});
