import { act, render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../msw";

// VM-07 (review follow-up): one failed check must not leave an error on the confirmation page for
// good. The error goes away when a check succeeds, shows only while there's no order to show, and
// an order that doesn't exist (404) isn't asked for again every 10 seconds.
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
vi.mock("next/navigation", () => ({
    useParams: () => ({ res: "demo-bistro", table: "T1", orderId: "665f00000000000000abc123" }),
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));
const { default: OrderConfirmation } = await import("@/features/customer/components/OrderConfirmation");

const ORDER = {
    _id: "665f00000000000000abc123",
    number: "ABC123",
    status: "pending",
    table: "T1",
    placedAt: "2026-11-23T12:34:00.000Z",
    lines: [{ name: "Fish Amok", priceCents: 550, quantity: 2, totalCents: 1100 }],
    totalCents: 1100,
};
const DOWN = () => HttpResponse.json({ message: "Service unavailable" }, { status: 503 });
const GONE = () => HttpResponse.json({ message: "Order not found" }, { status: 404 });

/** Answers the order checks in turn (the last answer repeats); returns how many were asked. */
function answers(...replies: (() => Response)[]) {
    const asked = { count: 0 };
    server.use(
        http.get("*/api/orders/demo-bistro/tables/T1/orders/:id", () => replies[Math.min(asked.count++, replies.length - 1)]!()),
        http.get("*/api/orders/demo-bistro/tables/T1/open-bill", () => HttpResponse.json({ table: "T1", orders: [], totalCents: 0 })),
    );
    return asked;
}
const order =
    (status = "pending") =>
    () =>
        HttpResponse.json({ ...ORDER, status });
const tick = () => act(() => vi.advanceTimersByTimeAsync(10_000));

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("the confirmation page recovers from a failed check (VM-07)", () => {
    it("a first load that failed: the error goes once the next check succeeds, and the order shows", async () => {
        answers(DOWN, order());
        render(<OrderConfirmation />);
        expect(await screen.findByRole("alert")).toBeTruthy();
        await tick();
        expect(await screen.findByRole("heading", { name: /Order #ABC123 sent to the kitchen/ })).toBeTruthy();
        expect(screen.queryByRole("alert")).toBeNull();
    });

    it("a failed check while the order shows doesn't cover it with an error, and the checks go on", async () => {
        answers(order(), DOWN, order("ready"));
        render(<OrderConfirmation />);
        await screen.findByRole("heading", { name: /Order #ABC123/ });
        await tick(); // this check fails
        expect(screen.queryByRole("alert")).toBeNull();
        expect(screen.getByRole("heading", { name: /Order #ABC123/ })).toBeTruthy();
        await tick(); // and this one brings the new status
        expect(within(screen.getByRole("status", { name: "Order status" })).getByText("Ready")).toBeTruthy();
    });

    it("an order that isn't there (404) says so, and isn't asked for again", async () => {
        const asked = answers(GONE);
        render(<OrderConfirmation />);
        expect(await screen.findByText(/Order not found/)).toBeTruthy();
        await tick();
        await tick();
        await tick();
        expect(asked.count).toBe(1);
    });

    it("an order that's gone after it was shown (404): the error shows instead, and the checks stop", async () => {
        const asked = answers(order(), GONE);
        render(<OrderConfirmation />);
        await screen.findByRole("heading", { name: /Order #ABC123/ });
        await tick();
        expect(await screen.findByText(/Order not found/)).toBeTruthy();
        expect(screen.queryByRole("heading", { name: /Order #ABC123/ })).toBeNull();
        await tick();
        await tick();
        expect(asked.count).toBe(2);
    });
});
