import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OwnerOverview } from "@vmenu/contracts";
import { overview } from "../fixtures";
import { server } from "../msw";

// VM-09: the owner's numbers are named xCount, revenue comes from paid bills, and the owner picks
// the period: today, 7 days, 30 days or all time.
vi.mock("@/lib/firebase", () => ({ auth: {} }));
// recharts' ResponsiveContainer measures itself; jsdom has no ResizeObserver
globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};
vi.mock("next/navigation", () => ({ useParams: () => ({ res: "demo-bistro" }), useRouter: () => ({ push: vi.fn() }) }));
const { default: AllOverview } = await import("@/features/owner/components/AllOverview");
const { default: Overview } = await import("@/features/restaurant/components/Overview");
const { ResContext } = await import("@/lib/restaurant-context");

const totals: OwnerOverview = {
    unpaidBillCount: 1,
    itemCount: 20,
    orderCount: 3,
    paymentCount: 2,
    revenue: 1225.25,
    itemsSoldCount: 8,
    avgItemsPerOrder: 4,
    topSellingItems: [
        { _id: "665f00000000000000000a03", name: "Kuy Teav", quantity: 4 },
        { _id: "665f00000000000000000a01", name: "Kuy Teav (large)", quantity: 3 },
    ],
    from: null,
    to: null,
};

function ownerOverview() {
    const asked: URLSearchParams[] = [];
    server.use(
        http.get("*/api/orders/owner/overview", ({ request }) => {
            asked.push(new URL(request.url).searchParams);
            return HttpResponse.json(totals);
        }),
    );
    return asked;
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date(2026, 10, 23, 15, 30) }));
afterEach(() => vi.useRealTimers());

describe("owner dashboard (VM-09)", () => {
    it("shows the revenue, the unpaid bills and the top sellers from the new fields", async () => {
        ownerOverview();
        render(<AllOverview />);
        const revenue = (await screen.findByText("Revenue")).closest("div")!.parentElement!;
        expect(within(revenue).getByText("$1,225.25")).toBeTruthy();
        expect(screen.getByText("Unpaid Bills")).toBeTruthy();
        expect(screen.getByText("Kuy Teav (large)")).toBeTruthy();
    });

    it("asks for all time first, then for the period the owner picks", async () => {
        const asked = ownerOverview();
        render(<AllOverview />);
        await screen.findByText("Revenue");
        expect(asked[0].toString()).toBe("");
        expect(screen.getByRole("button", { name: "All time" })).toHaveAttribute("aria-pressed", "true");

        fireEvent.click(screen.getByRole("button", { name: "7 days" }));
        await waitFor(() => expect(asked).toHaveLength(2));
        expect(new Date(asked[1].get("from")!)).toEqual(new Date(2026, 10, 17)); // today and the 6 days before, from midnight
        expect(asked[1].has("to")).toBe(false);

        fireEvent.click(screen.getByRole("button", { name: "Today" }));
        await waitFor(() => expect(asked).toHaveLength(3));
        expect(new Date(asked[2].get("from")!)).toEqual(new Date(2026, 10, 23));
    });
});

describe("one restaurant's overview (VM-09)", () => {
    it("shows its revenue next to the counts", async () => {
        server.use(http.get("*/api/orders/demo-bistro/overview", () => HttpResponse.json({ ...overview, revenue: 6.25 })));
        render(
            <ResContext.Provider value="demo-bistro">
                <Overview />
            </ResContext.Provider>,
        );
        expect(await screen.findByText("$6.25")).toBeTruthy();
        expect(screen.getByText("Unpaid Bills")).toBeTruthy();
        expect(screen.getByText("Total Tables").parentElement).toHaveTextContent(String(overview.tableCount));
    });
});
