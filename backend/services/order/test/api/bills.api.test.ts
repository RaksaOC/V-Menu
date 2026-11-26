import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { Bill } from "../../src/models/bill.model.js";
import { mongoBillsRepo } from "../../src/repositories/bills.repo.js";
import { app, cashier, ITEM, place, R, useOrderDb } from "./order-app.js";

useOrderDb();

describe("table requests (VM-30)", () => {
    const ask = (kind: string, table = "1") => request(app).post(`/api/orders/${R.slug}/tables/${table}/requests`).send({ kind });

    it("the customer requests the bill; the cashier sees it, then dismisses it", async () => {
        expect((await ask("bill")).status).toBe(409); // nothing ordered yet
        await place("1", 1);
        const asked = await ask("bill");
        expect(asked.status).toBe(200);
        expect(asked.body.kind).toBe("bill");
        expect((await ask("bill")).status).toBe(429);
        const [bill] = (await request(app).get(`/api/orders/${R.slug}/bills`).set(cashier)).body;
        expect(bill.billRequestedAt).toBe(asked.body.at);
        expect(bill.requestLog).toBeUndefined();
        const dismissed = await request(app).delete(`/api/orders/${R.slug}/bills/${bill._id}/requests/bill`).set(cashier);
        expect(dismissed.status).toBe(200);
        expect(dismissed.body.billRequestedAt).toBeUndefined();
    });

    it("refuses a bad kind", async () => {
        await place("1", 1);
        expect((await ask("dance")).status).toBe(400);
    });
});

describe("bills carry their server totals (VM-31)", () => {
    it("GET /bills and PATCH /bills/:id answer with lines, subtotal and total in cents", async () => {
        await place("1", 2);
        await place("1", 1);
        const [bill] = (await request(app).get(`/api/orders/${R.slug}/bills`).set(cashier)).body;
        expect(bill).toMatchObject({
            lines: [{ _id: ITEM._id, name: "Kuy Teav", priceCents: 250, quantity: 3, totalCents: 750 }],
            subtotalCents: 750,
            totalCents: 750,
        });
        const paid = await request(app).patch(`/api/orders/${R.slug}/bills/${bill._id}`).set(cashier).send({ isPaid: true });
        expect(paid.body).toMatchObject({ subtotalCents: 750, totalCents: 750 });
        const history = await request(app).get(`/api/orders/${R.slug}/bills?status=paid`).set(cashier);
        expect(history.body.bills[0]).toMatchObject({ subtotalCents: 750, totalCents: 750 });
    });
});

describe("one open bill per table (VM-08)", () => {
    const bills = async () =>
        (await request(app).get(`/api/orders/${R.slug}/bills`).set(cashier)).body as {
            _id: string;
            table: string;
            isPaid: boolean;
            orders: unknown[];
        }[];
    const setPaid = (id: string, isPaid: boolean) => request(app).patch(`/api/orders/${R.slug}/bills/${id}`).set(cashier).send({ isPaid });

    it("10 orders joining a table's bill at the same moment make exactly 1 open bill", async () => {
        // The bill upsert itself, as placing an order does it, 10 at once: without the unique
        // index, every run made several open bills.
        const orderIds = Array.from({ length: 10 }, () => new mongoose.Types.ObjectId().toString());
        await Promise.all(orderIds.map(async (id) => mongoBillsRepo.attachOrder(await mongoBillsRepo.openBillFor(R._id, "1"), id)));
        const open = await Bill.find({ resId: R._id, table: "1", isPaid: false }).lean();
        expect(open).toHaveLength(1);
        expect(open[0]!.orders.map(String).sort()).toEqual([...orderIds].sort());
    });

    it("10 orders placed at the same moment end up on exactly 1 open bill", async () => {
        const results = await Promise.all(Array.from({ length: 10 }, () => place("1", 1)));
        expect(results.map((r) => r.status)).toEqual(Array(10).fill(201));
        const open = (await bills()).filter((b) => b.table === "1" && !b.isPaid);
        expect(open).toHaveLength(1);
        expect(open[0]!.orders).toHaveLength(10);
    });

    it("re-opening a paid bill while the table has another open bill gives 409", async () => {
        await place();
        const [first] = await bills();
        expect((await setPaid(first!._id, true)).status).toBe(200);
        await place(); // the table's next visit: a new open bill
        const res = await setPaid(first!._id, false);
        expect(res.status).toBe(409);
        expect(res.body.code).toBe("TABLE_HAS_OPEN_BILL");
        expect((await bills()).filter((b) => !b.isPaid)).toHaveLength(1);
    });

    it("re-opening a paid bill is fine when the table has no other open bill", async () => {
        await place();
        const [first] = await bills();
        await setPaid(first!._id, true);
        const res = await setPaid(first!._id, false);
        expect(res.status).toBe(200);
        expect(res.body.isPaid).toBe(false);
    });
});

describe("internal: does a table have an unpaid bill? (VM-15)", () => {
    const ask = (name: string, key = "internal-test-key") =>
        request(app)
            .get(`/internal/restaurants/${R._id}/tables/${encodeURIComponent(name)}/open-bill`)
            .set("x-internal-key", key);

    it("yes while the table's bill is unpaid, no once it's paid, and no for a table without orders", async () => {
        process.env.INTERNAL_API_KEY = "internal-test-key";
        expect((await ask("1")).body).toEqual({ open: false });
        await request(app)
            .post(`/api/orders/${R.slug}`)
            .send({ table: "1", orderedItems: [{ item: { _id: ITEM._id }, quantity: 1 }] });
        expect((await ask("1")).body).toEqual({ open: true });
        expect((await ask("2")).body).toEqual({ open: false });
        const [bill] = (await request(app).get(`/api/orders/${R.slug}/bills`).set(cashier)).body;
        await request(app).patch(`/api/orders/${R.slug}/bills/${bill._id}`).set(cashier).send({ isPaid: true });
        expect((await ask("1")).body).toEqual({ open: false });
    });

    it("needs the internal key", async () => {
        process.env.INTERNAL_API_KEY = "internal-test-key";
        expect((await ask("1", "wrong-key-wrong-key")).status).toBe(401);
    });
});

describe("cashier bills: open ones by default, paid history a page at a time (VM-11)", () => {
    const list = (query = "") => request(app).get(`/api/orders/${R.slug}/bills${query}`).set(cashier);
    const pay = (id: string) => request(app).patch(`/api/orders/${R.slug}/bills/${id}`).set(cashier).send({ isPaid: true });

    it("open bills only, with their orders: the default, and ?status=open", async () => {
        await place("1");
        const [earlier] = (await list()).body;
        await pay(earlier._id); // the table's earlier visit, paid
        await place("1"); // its next visit
        for (const query of ["", "?status=open"]) {
            const res = await list(query);
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0]._id).not.toBe(earlier._id);
            expect(res.body[0].orders[0].orderedItems[0].item.name).toBe("Kuy Teav");
        }
        expect((await list("?status=everything")).status).toBe(400);
    });

    it("paid bills: most recently paid first, 20 a page, with the total", async () => {
        await Bill.collection.insertMany(
            Array.from({ length: 23 }, (_, i) => ({
                table: `t${i}`,
                resId: R._id,
                isPaid: true,
                orders: [],
                createdAt: new Date(Date.UTC(2026, 0, 1)),
                updatedAt: new Date(Date.UTC(2026, 0, 1, 0, i)), // when it was paid
            })),
        );
        await place("1"); // one still open
        const first = await list("?status=paid&page=1");
        expect(first.status).toBe(200);
        expect(first.body).toMatchObject({ page: 1, limit: 20, total: 23, pages: 2 });
        expect(first.body.bills).toHaveLength(20);
        expect(first.body.bills[0].table).toBe("t22");
        expect(first.body.bills.every((b: { isPaid: boolean }) => b.isPaid)).toBe(true);
        const second = await list("?status=paid&page=2");
        expect(second.body.bills.map((b: { table: string }) => b.table)).toEqual(["t2", "t1", "t0"]);
        expect((await list("?status=paid&limit=500")).body.limit).toBe(100);
        expect((await list("?status=paid&page=0")).status).toBe(400);
    });

    it("is backed by an index", async () => {
        const names = (await Bill.listIndexes()).map((i: { name: string }) => i.name);
        expect(names).toContain("resId_1_isPaid_1_updatedAt_-1");
    });
});

describe("isPayed is now isPaid; both work for one release (CL-06)", () => {
    const patch = (id: string, body: object) => request(app).patch(`/api/orders/${R.slug}/bills/${id}`).set(cashier).send(body);
    const openBill = async () => (await request(app).get(`/api/orders/${R.slug}/bills`).set(cashier)).body[0];

    it("bills answer with isPaid, and with isPayed for clients not yet updated", async () => {
        await place();
        const bill = await openBill();
        expect(bill).toMatchObject({ isPaid: false, isPayed: false });
    });

    it("a bill is marked paid with the new name, and reopened with the old one", async () => {
        await place();
        const { _id } = await openBill();
        const paid = await patch(_id, { isPaid: true });
        expect(paid.status).toBe(200);
        expect(paid.body).toMatchObject({ isPaid: true, isPayed: true });
        const reopened = await patch(_id, { isPayed: false });
        expect(reopened.status).toBe(200);
        expect(reopened.body.isPaid).toBe(false);
        expect((await Bill.findById(_id).lean())?.isPaid).toBe(false);
    });

    it("a bad value names the new field", async () => {
        await place();
        const res = await patch((await openBill())._id, { isPaid: "yes" });
        expect(res.status).toBe(400);
        expect(res.body.fields).toEqual({ isPaid: "Must be true or false" });
    });
});
