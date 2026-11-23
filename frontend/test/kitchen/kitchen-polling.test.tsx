import { act, fireEvent, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { server } from "../msw";

// VM-10: the kitchen asks only for the orders still to cook, every 5 seconds, and its history
// comes a page at a time.
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("next/navigation", () => ({
    useParams: () => ({ res: "demo-bistro" }),
    useRouter: () => ({ push: vi.fn() }),
    usePathname: () => "/demo-bistro/kitchen",
}));
const { default: KitchenBoard } = await import("@/features/kitchen/components/KitchenBoard");
const { default: KitchenHistory } = await import("@/features/kitchen/components/KitchenHistory");

const dish = { _id: "i1", name: "Kuy Teav", priceCents: 250, image: "/k.jpg", isEnabled: true };
const order = (n: number, status = "pending") => ({
    _id: `o${n}`,
    table: `T${n}`,
    status, // VM-27 (was isDone)
    createdAt: "2026-11-23T10:00:00Z",
    orderedItems: [{ item: dish, quantity: 1 }],
});
afterEach(() => vi.useRealTimers());

describe("kitchen board", () => {
    it("asks for active orders only, and polls every 5 seconds", async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const queries: string[] = [];
        server.use(
            http.get("*/api/orders/demo-bistro/kitchen", ({ request }) => {
                queries.push(new URL(request.url).search);
                return HttpResponse.json([order(1)]);
            }),
        );
        render(<KitchenBoard />);
        expect(await screen.findByText(/T1/)).toBeTruthy();
        const initial = queries.length;
        await act(() => vi.advanceTimersByTimeAsync(2500));
        expect(queries.length).toBe(initial); // not every 2 s any more
        await act(() => vi.advanceTimersByTimeAsync(3000));
        expect(queries.length).toBe(initial + 1);
        expect(new Set(queries)).toEqual(new Set(["?status=active"]));
    });
});

describe("kitchen history", () => {
    it("shows one page of finished orders and moves between pages", async () => {
        const pages: Record<string, object> = {
            "1": { orders: [order(1, "served"), order(2, "served")], page: 1, limit: 20, total: 22, pages: 2 },
            "2": { orders: [order(21, "served"), order(22, "cancelled")], page: 2, limit: 20, total: 22, pages: 2 },
        };
        server.use(
            http.get("*/api/orders/demo-bistro/kitchen/history", ({ request }) =>
                HttpResponse.json(pages[new URL(request.url).searchParams.get("page") ?? "1"]),
            ),
        );
        render(<KitchenHistory />);
        expect(await screen.findByText(/T1\b/)).toBeTruthy();
        expect(screen.getByText(/Page 1 of 2/)).toBeTruthy();
        expect(screen.getByText(/22 finished orders/)).toBeTruthy();
        expect((screen.getByRole("button", { name: /previous/i }) as HTMLButtonElement).disabled).toBe(true);
        fireEvent.click(screen.getByRole("button", { name: /next/i }));
        expect(await screen.findByText(/T21\b/)).toBeTruthy();
        expect(screen.getByText(/Page 2 of 2/)).toBeTruthy();
        expect((screen.getByRole("button", { name: /next/i }) as HTMLButtonElement).disabled).toBe(true);
    });
});
