import { afterEach, describe, expect, it, vi } from "vitest";
import { billsService } from "../../src/services/bills.service.js";
import { ordersService } from "../../src/services/orders.service.js";
import { requestsService } from "../../src/services/requests.service.js";
import { R1, fakeBills, fakeClients, fakeOrders, DISH } from "./fakes.js";

// VM-30: "Request bill" and "Call staff" set a flag on the table's open bill, at most once per
// 2 minutes per button; the cashier sees it until the bill is paid or they dismiss it.
const status = (p: Promise<unknown>) => p.then(() => 200).catch((e: { status?: number }) => e.status ?? 500);
const MIN = 60_000;

function setup() {
    const orders = fakeOrders();
    const bills = fakeBills(orders);
    const placing = ordersService({ orders, bills, clients: fakeClients() });
    return {
        bills,
        billing: billsService({ bills, orders }),
        requests: requestsService({ bills }),
        order: (table = "1") => placing.place(R1._id, { table, orderedItems: [{ item: { _id: DISH._id }, quantity: 1 }] }),
    };
}
const openBill = async (s: ReturnType<typeof setup>) => (await s.billing.open(R1._id))[0];

afterEach(() => vi.useRealTimers());

describe("table requests (VM-30)", () => {
    it("Request bill sets billRequestedAt on the table's open bill; Call staff sets staffCalledAt", async () => {
        vi.useFakeTimers({ now: new Date("2026-11-24T10:00:00Z") });
        const s = setup();
        await s.order();
        expect(await s.requests.ask(R1._id, "1", { kind: "bill" })).toEqual({ kind: "bill", at: new Date("2026-11-24T10:00:00Z") });
        vi.setSystemTime(new Date("2026-11-24T10:01:00Z"));
        await s.requests.ask(R1._id, "1", { kind: "staff" });
        const bill = await openBill(s);
        expect(bill.billRequestedAt).toEqual(new Date("2026-11-24T10:00:00Z"));
        expect(bill.staffCalledAt).toEqual(new Date("2026-11-24T10:01:00Z"));
    });

    it("each button works at most once per 2 minutes, even after the cashier dismissed it", async () => {
        vi.useFakeTimers({ now: new Date("2026-11-24T10:00:00Z") });
        const s = setup();
        await s.order();
        await s.requests.ask(R1._id, "1", { kind: "bill" });
        vi.advanceTimersByTime(1.5 * MIN);
        expect(await status(s.requests.ask(R1._id, "1", { kind: "bill" }))).toBe(429);
        expect(await status(s.requests.ask(R1._id, "1", { kind: "staff" }))).toBe(200); // the other button is separate
        await s.requests.dismiss(R1._id, String((await openBill(s))._id), "bill");
        expect(await status(s.requests.ask(R1._id, "1", { kind: "bill" }))).toBe(429);
        vi.advanceTimersByTime(0.6 * MIN);
        expect(await status(s.requests.ask(R1._id, "1", { kind: "bill" }))).toBe(200);
    });

    it("pressing again while the request still waits keeps its first time", async () => {
        vi.useFakeTimers({ now: new Date("2026-11-24T10:00:00Z") });
        const s = setup();
        await s.order();
        await s.requests.ask(R1._id, "1", { kind: "bill" });
        vi.advanceTimersByTime(3 * MIN);
        await s.requests.ask(R1._id, "1", { kind: "bill" });
        expect((await openBill(s)).billRequestedAt).toEqual(new Date("2026-11-24T10:00:00Z"));
    });

    it("the flags clear when the bill is paid", async () => {
        const s = setup();
        await s.order();
        await s.requests.ask(R1._id, "1", { kind: "bill" });
        await s.requests.ask(R1._id, "1", { kind: "staff" });
        const paid = await s.billing.setPaid(R1._id, String((await openBill(s))._id), true);
        expect(paid.billRequestedAt).toBeUndefined();
        expect(paid.staffCalledAt).toBeUndefined();
    });

    it("the cashier dismisses one flag; the other stays", async () => {
        const s = setup();
        await s.order();
        await s.requests.ask(R1._id, "1", { kind: "bill" });
        await s.requests.ask(R1._id, "1", { kind: "staff" });
        const dismissed = await s.requests.dismiss(R1._id, String((await openBill(s))._id), "bill");
        expect(dismissed.billRequestedAt).toBeUndefined();
        expect(dismissed.staffCalledAt).toBeInstanceOf(Date);
    });

    it("needs an open bill with an order; a bad kind or id is 400, an unknown bill 404", async () => {
        const s = setup();
        expect(await status(s.requests.ask(R1._id, "1", { kind: "bill" }))).toBe(409);
        await s.order();
        expect(await status(s.requests.ask(R1._id, "1", { kind: "dance" }))).toBe(400);
        expect(await status(s.requests.dismiss(R1._id, "nope", "bill"))).toBe(400);
        expect(await status(s.requests.dismiss(R1._id, String((await openBill(s))._id), "dance"))).toBe(400);
        expect(await status(s.requests.dismiss(R1._id, "665f00000000000000000fff", "bill"))).toBe(404);
    });

    it("the cashier's answers never show the internal press times", async () => {
        const s = setup();
        await s.order();
        await s.requests.ask(R1._id, "1", { kind: "bill" });
        expect(Object.keys(await openBill(s))).not.toContain("requestLog");
    });
});
