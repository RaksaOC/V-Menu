import { act, render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { server } from "../msw";

// VM-27: the confirmation page shows the order's live status, checking every 10 seconds.
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
    lines: [{ name: "Fish Amok", price: 5.5, quantity: 2, total: 11 }],
    total: 11,
};
afterEach(() => vi.useRealTimers());

function api(answer: () => object) {
    const asked: number[] = [];
    server.use(
        http.get("*/api/orders/demo-bistro/tables/T1/orders/:id", () => {
            asked.push(Date.now());
            return HttpResponse.json(answer());
        }),
        http.get("*/api/orders/demo-bistro/tables/T1/open-bill", () => HttpResponse.json({ table: "T1", orders: [answer()], total: 11 })),
    );
    return asked;
}

describe("order status on the confirmation page", () => {
    it("shows the status, and the new one within 10 seconds", async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        let status = "pending";
        api(() => ({ ...ORDER, status }));
        render(<OrderConfirmation />);
        expect(within(await screen.findByRole("status", { name: "Order status" })).getByText("Waiting for the kitchen")).toBeTruthy();
        status = "ready";
        await act(() => vi.advanceTimersByTimeAsync(10_000));
        expect(within(screen.getByRole("status", { name: "Order status" })).getByText("Ready")).toBeTruthy();
    });

    it("a cancelled order says so, with the reason, and stops checking", async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const asked = api(() => ({ ...ORDER, status: "cancelled", cancelReason: "Out of fish" }));
        render(<OrderConfirmation />);
        const box = await screen.findByRole("status", { name: "Order status" });
        expect(within(box).getByText("Cancelled")).toBeTruthy();
        expect(within(box).getByText(/Out of fish/)).toBeTruthy();
        await act(() => vi.advanceTimersByTimeAsync(30_000));
        expect(asked.length).toBe(1); // asked once: a final status isn't asked for again, not even once more
    });
});
