import { describe, expect, it } from "vitest";
import * as C from "../src/index.js";

// VM-28: an optional note per line (at most 100 characters) and per order (at most 200).
const DISH = "665f0000000000000000aaaa";
const body = (lineNote?: unknown, note?: unknown) => ({
    table: "T1",
    orderedItems: [{ item: { _id: DISH }, quantity: 1, ...(lineNote !== undefined && { note: lineNote }) }],
    ...(note !== undefined && { note }),
});

describe("order notes (VM-28)", () => {
    it("are trimmed, with runs of spaces and line breaks made one space", () => {
        const parsed = C.PlaceOrderBody.parse(body("  no   chilli\n please ", "  birthday,\n\nbring a candle "));
        expect(parsed.orderedItems[0].note).toBe("no chilli please");
        expect(parsed.note).toBe("birthday, bring a candle");
    });

    it("are optional; an empty note is no note", () => {
        const parsed = C.PlaceOrderBody.parse(body("   ", ""));
        expect("note" in parsed.orderedItems[0]).toBe(false);
        expect("note" in parsed).toBe(false);
        expect(C.PlaceOrderBody.parse(body()).orderedItems[0]).toEqual({ item: { _id: DISH }, quantity: 1 });
    });

    it("a line note is at most 100 characters, an order note at most 200", () => {
        expect(C.LINE_NOTE_MAX).toBe(100);
        expect(C.ORDER_NOTE_MAX).toBe(200);
        expect(C.PlaceOrderBody.safeParse(body("x".repeat(100), "y".repeat(200))).success).toBe(true);
        const line = C.PlaceOrderBody.safeParse(body("x".repeat(101)));
        expect(line.success).toBe(false);
        expect(line.error?.issues[0].path).toEqual(["orderedItems", 0, "note"]);
        const order = C.PlaceOrderBody.safeParse(body(undefined, "y".repeat(201)));
        expect(order.error?.issues[0].path).toEqual(["note"]);
        expect(C.PlaceOrderBody.safeParse(body(42)).success).toBe(false);
    });

    it("orders carry them", () => {
        const order = {
            _id: DISH,
            table: "T1",
            status: "pending",
            createdAt: "2026-11-24T00:00:00.000Z",
            note: "birthday",
            orderedItems: [
                { item: { _id: DISH, name: "Amok", priceCents: 500, image: "/a", isEnabled: true }, quantity: 1, note: "no chilli" },
            ],
        };
        expect(C.Order.parse(order)).toMatchObject({ note: "birthday", orderedItems: [{ note: "no chilli" }] });
    });
});
