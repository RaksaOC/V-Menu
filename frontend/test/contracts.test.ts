import { describe, expect, it, vi } from "vitest";
import * as C from "@vmenu/contracts";
import * as F from "./fixtures";

vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));

// CL-05: the frontend's test fixtures are real API shapes.
describe("frontend fixtures match @vmenu/contracts", () => {
    it.each([
        ["dish", C.MenuItem, F.dish],
        ["table", C.Table, F.table],
        ["order", C.Order, F.order],
        ["bill", C.Bill, F.bill],
        ["overview", C.Overview, F.overview],
        ["restaurant", C.Restaurant, F.restaurant],
        ["staff member", C.StaffMember, F.staffMember],
    ] as const)("%s", (_name, schema, value) => {
        expect(schema.safeParse(value).success).toBe(true);
    });

    it("the kitchen's steps are the contract's (VM-27)", async () => {
        const { NEXT_STATUS } = await import("@/lib/order-status");
        expect(NEXT_STATUS).toEqual(C.NEXT_STATUS);
    });

    it("the cart's limit on lines is the contract's (VM-22)", async () => {
        const { MAX_ORDER_LINES, LINE_NOTE_MAX, ORDER_NOTE_MAX } = await import("@/features/customer/cart");
        expect(MAX_ORDER_LINES).toBe(C.MAX_ORDER_LINES);
        expect(LINE_NOTE_MAX).toBe(C.LINE_NOTE_MAX); // VM-28
        expect(ORDER_NOTE_MAX).toBe(C.ORDER_NOTE_MAX);
    });

    it("what the cart sends is a valid PlaceOrderBody (and no isDone)", async () => {
        const { toOrderBody } = await import("@/features/customer/cart");
        const lines = [{ item: F.dish, quantity: 2 }];
        const orderedItems = [{ item: { _id: F.dish._id }, quantity: 2 }];
        const body = toOrderBody({ token: null, name: "T1" }, lines);
        expect(C.PlaceOrderBody.parse(body)).toEqual({ table: "T1", orderedItems });
        expect(body).not.toHaveProperty("isDone");
        // SEC-04: through a table's link, the token goes and the name doesn't
        const QR = "AbCdEfGhIjKlMnOpQrSt_-";
        expect(C.PlaceOrderBody.parse(toOrderBody({ token: QR, name: "" }, lines))).toEqual({ qrToken: QR, orderedItems });
    });
});
