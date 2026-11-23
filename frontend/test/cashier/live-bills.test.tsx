import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../msw";

// VM-11: the cashier's open bills keep themselves up to date, and the history comes a page at a time.
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toast }));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
vi.mock("next/navigation", () => ({ useParams: () => ({ res: "demo-bistro" }), useRouter: () => ({ push: vi.fn() }) }));
const { default: Orders } = await import("@/features/cashier/components/orders/Orders");

const dish = { _id: "i1", name: "Kuy Teav", price: 2.5, image: "/k.jpg", isEnabled: true };
const order = (id: string) => ({
    _id: id,
    table: "x",
    status: "pending", // VM-27
    createdAt: "2026-11-23T10:00:00Z",
    orderedItems: [{ item: dish, quantity: 1 }],
});
const bill = (id: string, table: string, orders = [order(`${id}-o1`)], isPaid = false) => ({
    _id: id,
    table,
    isPaid,
    createdAt: "2026-11-23T10:00:00Z",
    orders,
});

/** Answers GET /bills?status=open with the next list each time (the last one repeats). */
function openBills(...answers: object[][]) {
    const queries: string[] = [];
    server.use(
        http.get("*/api/orders/demo-bistro/bills", ({ request }) => {
            const url = new URL(request.url);
            if (url.searchParams.get("status") === "paid") return HttpResponse.json({ bills: [], page: 1, limit: 20, total: 0, pages: 1 });
            queries.push(url.search);
            return HttpResponse.json(answers[Math.min(queries.length - 1, answers.length - 1)]);
        }),
    );
    return queries;
}
const card = (table: string) => screen.getByRole("heading", { name: `Table ${table}` }).closest("article") as HTMLElement;

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("cashier open bills", () => {
    it("asks for open bills only, every 10 seconds, and a new table's bill appears with NEW", async () => {
        const queries = openBills([bill("b1", "T1")], [bill("b1", "T1"), bill("b2", "T2")]);
        render(<Orders />);
        expect(await screen.findByRole("heading", { name: "Table T1" })).toBeTruthy();
        expect(within(card("T1")).queryByText("NEW")).toBeNull(); // nothing is new on first load
        await act(() => vi.advanceTimersByTimeAsync(5000));
        expect(screen.queryByRole("heading", { name: "Table T2" })).toBeNull(); // not before 10 s
        await act(() => vi.advanceTimersByTimeAsync(5000));
        expect(await screen.findByRole("heading", { name: "Table T2" })).toBeTruthy();
        expect(within(card("T2")).getByText("NEW")).toBeTruthy();
        expect(new Set(queries)).toEqual(new Set(["?status=open"]));
    });

    it("marks a bill NEW when it gets another order", async () => {
        openBills([bill("b1", "T1")], [bill("b1", "T1", [order("o1"), order("o2")])]);
        render(<Orders />);
        await screen.findByRole("heading", { name: "Table T1" });
        await act(() => vi.advanceTimersByTimeAsync(10_000));
        expect(await within(card("T1")).findByText("NEW")).toBeTruthy();
    });

    it("has a Refresh button and says when it last updated", async () => {
        const queries = openBills([bill("b1", "T1")], [bill("b1", "T1"), bill("b3", "T3")]);
        render(<Orders />);
        await screen.findByRole("heading", { name: "Table T1" });
        expect(screen.getByText(/updated just now/i)).toBeTruthy();
        await act(() => vi.advanceTimersByTimeAsync(5000));
        expect(screen.getByText(/updated 5 s ago/i)).toBeTruthy();
        const before = queries.length;
        fireEvent.click(screen.getByRole("button", { name: /refresh/i }));
        expect(await screen.findByRole("heading", { name: "Table T3" })).toBeTruthy();
        expect(queries.length).toBe(before + 1);
        expect(screen.getByText(/updated just now/i)).toBeTruthy();
    });

    it("marking paid reloads the list in place, and shows the server's reason when it can't", async () => {
        openBills([bill("b1", "T1"), bill("b2", "T2")], [bill("b2", "T2")]);
        let status = 200;
        server.use(
            http.patch("*/api/orders/demo-bistro/bills/:id", () =>
                status === 200
                    ? HttpResponse.json({})
                    : HttpResponse.json(
                          { message: "This table already has an open bill. Add to that one instead.", code: "TABLE_HAS_OPEN_BILL" },
                          { status },
                      ),
            ),
        );
        const reload = vi.fn();
        vi.stubGlobal("location", { ...window.location, reload });
        render(<Orders />);
        await screen.findByRole("heading", { name: "Table T1" });
        fireEvent.click(within(card("T1")).getByRole("button", { name: /mark as paid/i }));
        await vi.waitFor(() => expect(screen.queryByRole("heading", { name: "Table T1" })).toBeNull());
        expect(reload).not.toHaveBeenCalled();
        status = 409;
        fireEvent.click(within(card("T2")).getByRole("button", { name: /mark as paid/i }));
        await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("This table already has an open bill. Add to that one instead."));
        vi.unstubAllGlobals();
    });
});

describe("cashier bill history", () => {
    it("shows paid bills a page at a time (not the open ones)", async () => {
        openBills([bill("b1", "OPEN1")]);
        const pages: Record<string, object> = {
            "1": { bills: [bill("p1", "P1", undefined, true)], page: 1, limit: 20, total: 21, pages: 2 },
            "2": { bills: [bill("p21", "P21", undefined, true)], page: 2, limit: 20, total: 21, pages: 2 },
        };
        const asked: string[] = [];
        server.use(
            http.get("*/api/orders/demo-bistro/bills", ({ request }) => {
                const url = new URL(request.url);
                if (url.searchParams.get("status") !== "paid") return undefined;
                asked.push(url.search);
                return HttpResponse.json(pages[url.searchParams.get("page") ?? "1"]);
            }),
        );
        render(<Orders />);
        await screen.findByRole("heading", { name: "Table OPEN1" });
        fireEvent.click(screen.getByRole("button", { name: /view order history/i }));
        expect(await screen.findByRole("heading", { name: "Table P1" })).toBeTruthy();
        expect(screen.queryByRole("heading", { name: "Table OPEN1" })).toBeNull();
        expect(screen.getByText(/Page 1 of 2/)).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: /next/i }));
        expect(await screen.findByRole("heading", { name: "Table P21" })).toBeTruthy();
        expect(asked).toEqual(["?status=paid&page=1&limit=20", "?status=paid&page=2&limit=20"]);
    });
});
