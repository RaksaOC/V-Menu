import { describe, expect, it } from "vitest";
import * as C from "../src/index.js";

// CL-07: money is whole cents; toCents and formatMoney are the only converters.
describe("toCents", () => {
    it.each([
        [2.35, 235],
        [2.35 * 3, 705], // 7.050000000000001 as a float
        [0.1 + 0.2, 30], // 0.30000000000000004 as a float
        [1.005, 101], // 100.49999... if multiplied by 100
        [19.99, 1999],
        [5, 500],
        [0, 0],
        [0.0000001, 0], // a number JavaScript prints with an exponent
    ])("%d dollars is %d cents", (dollars, cents) => {
        expect(C.toCents(dollars)).toBe(cents);
    });

    it("adding in cents has no floating-point dust", () => {
        expect(C.toCents(0.1) + C.toCents(0.2)).toBe(30);
        expect(C.toCents(2.35) * 3).toBe(705);
    });
});

describe("formatMoney", () => {
    it.each([
        [122525, "$1,225.25"],
        [705, "$7.05"],
        [5, "$0.05"],
        [0, "$0.00"],
    ])("%d cents is %s", (cents, shown) => {
        expect(C.formatMoney(cents)).toBe(shown);
    });
});

describe("a bill's lines and totals (VM-31)", () => {
    const bill = {
        _id: "1",
        table: "1",
        isPaid: false,
        orders: [],
        createdAt: "2026-11-24T00:00:00.000Z",
        lines: [{ _id: "d1", name: "Amok", priceCents: 235, quantity: 3, totalCents: 705 }],
        subtotalCents: 705,
        totalCents: 705,
    };

    it("every bill has them, in whole cents", () => {
        expect(C.Bill.safeParse(bill).success).toBe(true);
        expect(C.Bill.safeParse({ ...bill, totalCents: undefined }).success).toBe(false);
        expect(C.Bill.safeParse({ ...bill, subtotalCents: 7.05 }).success).toBe(false);
        expect(C.Bill.safeParse({ ...bill, lines: undefined }).success).toBe(false);
    });

    it("so does the customer's view of the bill", () => {
        const { lines, subtotalCents, totalCents } = bill;
        expect(C.TableBill.safeParse({ table: "1", orders: [], lines, subtotalCents, totalCents }).success).toBe(true);
        expect(C.TableBill.safeParse({ table: "1", orders: [], totalCents }).success).toBe(false);
    });
});

describe("prices in the API are whole cents (CL-07)", () => {
    const dish = { name: "Amok", image: "/a.jpg" };
    const fieldsOf = (schema: { safeParse(v: unknown): { success: boolean; error?: { issues: { path: PropertyKey[] }[] } } }, v: unknown) =>
        schema.safeParse(v).error?.issues.map((i) => i.path.join(".")) ?? [];

    it("a new dish has priceCents, a whole number from 0", () => {
        expect(C.CreateItemBody.parse({ ...dish, priceCents: 235 })).toMatchObject({ priceCents: 235 });
        expect(fieldsOf(C.CreateItemBody, { ...dish, priceCents: 2.5 })).toEqual(["priceCents"]);
        expect(fieldsOf(C.CreateItemBody, { ...dish, priceCents: -1 })).toEqual(["priceCents"]);
        expect(fieldsOf(C.CreateItemBody, dish)).toEqual(["priceCents"]);
    });

    it("the old `price` in dollars still works for one release", () => {
        expect(C.CreateItemBody.parse({ ...dish, price: 2.35 })).toMatchObject({ priceCents: 235 });
        expect(C.CreateItemBody.parse({ ...dish, price: "2.35" })).toMatchObject({ priceCents: 235 });
        expect(C.UpdateItemBody.parse({ price: 3 })).toEqual({ priceCents: 300 });
        expect(fieldsOf(C.CreateItemBody, { ...dish, price: "free" })).toEqual(["price"]); // VM-17: under the field that old page sent
        expect(C.CreateItemBody.parse({ ...dish, price: 9, priceCents: 235 })).toMatchObject({ priceCents: 235 }); // cents win
    });

    it("an update can leave the price alone", () => {
        expect(C.UpdateItemBody.parse({ name: "New name" })).toEqual({ name: "New name" });
    });

    it("every money field in an answer is in cents", () => {
        const item = { _id: "1", name: "Amok", priceCents: 235, image: "/a.jpg", isEnabled: true };
        expect(C.MenuItem.safeParse(item).success).toBe(true);
        expect(C.OrderedDish.safeParse(item).success).toBe(true);
        expect(C.OrderedDish.safeParse({ ...item, priceCents: 2.35 }).success).toBe(false);
        const line = { name: "Amok", priceCents: 235, quantity: 3, totalCents: 705 };
        expect(
            C.TableOrderView.safeParse({
                _id: "1",
                number: "000001",
                status: "pending",
                table: "1",
                placedAt: "2026-11-24T00:00:00.000Z",
                lines: [line],
                totalCents: 705,
            }).success,
        ).toBe(true);
        expect(C.TableBill.safeParse({ table: "1", orders: [], lines: [], subtotalCents: 0, totalCents: 0 }).success).toBe(true);
        const overview = {
            tableCount: 1,
            activeTableCount: 1,
            itemCount: 1,
            orderCount: 1,
            unpaidBillCount: 0,
            paymentCount: 1,
            revenueCents: 705,
            from: null,
            to: null,
        };
        expect(C.Overview.safeParse(overview).success).toBe(true);
        expect(C.Overview.safeParse({ ...overview, revenueCents: 7.05 }).success).toBe(false);
    });
});

// VM-24: the restaurant picks how prices show: US dollars, riel, or both, at its own exchange rate.
describe("formatMoney in the restaurant's currency (VM-24)", () => {
    const usd = { currency: "USD", khrPerUsd: 4100 } as const;
    const khr = { currency: "KHR", khrPerUsd: 4100 } as const;
    const both = { currency: "both", khrPerUsd: 4000 } as const;

    it("USD, as before, and the default", () => {
        expect(C.formatMoney(250, usd)).toBe("$2.50");
        expect(C.formatMoney(250)).toBe("$2.50");
    });

    it("KHR: whole riel, rounded to the nearest 100 like cash", () => {
        expect(C.formatMoney(250, khr)).toBe("៛10,300"); // 10,250 riel
        expect(C.formatMoney(100, khr)).toBe("៛4,100");
        expect(C.formatMoney(0, khr)).toBe("៛0");
        expect(C.formatMoney(122525, { currency: "KHR", khrPerUsd: 4000 })).toBe("៛4,901,000");
    });

    it("both: dollars first, then riel", () => {
        expect(C.formatMoney(250, both)).toBe("$2.50 · ៛10,000");
        expect(C.formatMoney(705, both)).toBe("$7.05 · ៛28,200");
    });

    it("the settings: defaults, limits, and a payment QR that is one of the restaurant's own photos", () => {
        expect(C.DEFAULT_MONEY).toEqual({ currency: "USD", khrPerUsd: 4100 });
        expect(C.UpdateSettingsBody.parse({ currency: "both", khrPerUsd: 4000 })).toEqual({ currency: "both", khrPerUsd: 4000 });
        expect(C.UpdateSettingsBody.safeParse({ currency: "EUR" }).success).toBe(false);
        expect(C.UpdateSettingsBody.safeParse({ khrPerUsd: 4100.5 }).success).toBe(false);
        expect(C.UpdateSettingsBody.safeParse({ khrPerUsd: 99 }).success).toBe(false);
        const qr = `/api/menu/demo-bistro/images/${"a".repeat(24)}`;
        expect(C.UpdateSettingsBody.parse({ paymentQrUrl: qr })).toEqual({ paymentQrUrl: qr });
        expect(C.UpdateSettingsBody.parse({ paymentQrUrl: null })).toEqual({ paymentQrUrl: null });
        expect(C.UpdateSettingsBody.safeParse({ paymentQrUrl: "https://example.com/qr.png" }).success).toBe(false);
        expect(C.UpdateSettingsBody.safeParse({ paymentQrUrl: "javascript:alert(1)" }).success).toBe(false);
    });
});
