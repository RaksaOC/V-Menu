import { render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../msw";

// VM-07: after ordering, the customer sees the order as the server saved it.
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
vi.mock("next/navigation", () => ({
    useParams: () => ({ res: "demo-bistro", table: "T1", orderId: "665f00000000000000abc123" }),
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));
const { default: OrderConfirmation } = await import("@/features/customer/components/OrderConfirmation");

const ORDER = {
    _id: "665f00000000000000abc123",
    number: "ABC123",
    table: "T1",
    placedAt: "2026-11-23T12:34:00.000Z",
    lines: [
        { name: "Fish Amok", price: 5.5, quantity: 2, total: 11 },
        { name: "Iced Coffee", price: 1.5, quantity: 1, total: 1.5 },
    ],
    total: 12.5,
};
const EARLIER = {
    ...ORDER,
    _id: "665f00000000000000aaa111",
    number: "AAA111",
    lines: [{ name: "Fried Rice", price: 3.5, quantity: 1, total: 3.5 }],
    total: 3.5,
};

function api({ order = ORDER, bill = { table: "T1", orders: [EARLIER, ORDER], total: 16 } } = {}) {
    server.use(
        http.get("*/api/orders/demo-bistro/tables/T1/orders/:id", () => HttpResponse.json(order)),
        http.get("*/api/orders/demo-bistro/tables/T1/open-bill", () => HttpResponse.json(bill)),
    );
}

describe("order confirmation", () => {
    it("says the order went to the kitchen, with its number", async () => {
        api();
        render(<OrderConfirmation />);
        expect(await screen.findByRole("heading", { name: /Order #ABC123 sent to the kitchen/ })).toBeTruthy();
    });

    it("lists the lines with the server's prices and total, and when it was placed", async () => {
        api();
        render(<OrderConfirmation />);
        const order = await screen.findByRole("region", { name: /this order/i });
        expect(within(order).getByText("Fish Amok")).toBeTruthy();
        expect(within(order).getByText("2 × $5.50")).toBeTruthy();
        expect(within(order).getByText("$11.00")).toBeTruthy();
        expect(within(order).getByText("$12.50")).toBeTruthy();
        expect(within(order).getByText(/Placed at/)).toBeTruthy();
    });

    it("has an Order more link back to this table's menu", async () => {
        api();
        render(<OrderConfirmation />);
        const more = await screen.findByRole("link", { name: /order more/i });
        expect(more.getAttribute("href")).toBe("/demo-bistro/customer/T1");
    });

    it("lists the table's orders so far, with the bill's total", async () => {
        api();
        render(<OrderConfirmation />);
        const list = await screen.findByRole("region", { name: /your orders at this table/i });
        expect(within(list).getByText("#AAA111")).toBeTruthy();
        expect(within(list).getByText("#ABC123")).toBeTruthy();
        expect(within(list).getByText("$16.00")).toBeTruthy();
    });

    it("says so when the order can't be found", async () => {
        server.use(
            http.get("*/api/orders/demo-bistro/tables/T1/orders/:id", () =>
                HttpResponse.json({ message: "Order not found" }, { status: 404 }),
            ),
        );
        server.use(
            http.get("*/api/orders/demo-bistro/tables/T1/open-bill", () => HttpResponse.json({ table: "T1", orders: [], total: 0 })),
        );
        render(<OrderConfirmation />);
        expect(await screen.findByText(/Order not found/)).toBeTruthy();
        expect(screen.getByRole("link", { name: /back to the menu|order more/i })).toBeTruthy();
    });
});
