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

    it("what the cart sends is a valid PlaceOrderBody (and no isDone)", async () => {
        const { toOrderBody } = await import("@/features/customer/cart");
        const body = toOrderBody("T1", [{ item: F.dish, quantity: 2 }]);
        expect(C.PlaceOrderBody.parse(body)).toEqual({ table: "T1", orderedItems: [{ item: { _id: F.dish._id }, quantity: 2 }] });
        expect(body).not.toHaveProperty("isDone");
    });
});
