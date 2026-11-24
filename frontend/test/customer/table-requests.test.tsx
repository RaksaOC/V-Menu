import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { bill } from "../fixtures";
import { server } from "../msw";

// VM-30: the customer presses "Request bill" or "Call staff"; the cashier's card shows a badge.
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }, ToastContainer: () => null }));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("next/navigation", () => ({ useParams: () => ({ res: "demo-bistro", table: "T1" }), useRouter: () => ({ push: vi.fn() }) }));
const { default: TableRequests } = await import("@/features/customer/components/TableRequests");
const { default: OrderCard } = await import("@/features/cashier/components/orders/OrderCard");

const openBill = (orders: unknown[]) =>
    http.get("*/api/orders/demo-bistro/tables/T1/open-bill", () =>
        HttpResponse.json({ table: "T1", orders, lines: [], subtotalCents: 0, totalCents: 0 }),
    );
const placed = {
    _id: "665f00000000000000000031",
    number: "000031",
    status: "pending",
    table: "T1",
    placedAt: "2026-11-24T10:00:00Z",
    lines: [],
    totalCents: 0,
};

describe("the customer's buttons (VM-30)", () => {
    it("are on the customer menu", () => {
        const menu = readFileSync(join(__dirname, "..", "..", "src", "features", "customer", "components", "CustomerMenu.tsx"), "utf8");
        expect(menu).toMatch(/<TableRequests\b/);
    });

    it("wait until the table has ordered", async () => {
        server.use(openBill([]));
        render(<TableRequests slug="demo-bistro" table="T1" />);
        await waitFor(() => expect(screen.queryByRole("button", { name: "Request bill" })).toBeNull());
        expect(screen.queryByRole("button", { name: "Call staff" })).toBeNull();
    });

    it("Request bill tells the staff, says so, and can't be pressed again for now", async () => {
        const asked: unknown[] = [];
        server.use(
            openBill([placed]),
            http.post("*/api/orders/demo-bistro/tables/T1/requests", async ({ request }) => {
                asked.push(await request.json());
                return HttpResponse.json({ kind: "bill", at: new Date().toISOString() });
            }),
        );
        render(<TableRequests slug="demo-bistro" table="T1" />);
        fireEvent.click(await screen.findByRole("button", { name: "Request bill" }));
        expect(await screen.findByText(/We've told the staff you'd like the bill/)).toBeTruthy();
        expect(asked).toEqual([{ kind: "bill" }]);
        expect((screen.getByRole("button", { name: "Bill requested" }) as HTMLButtonElement).disabled).toBe(true);
        expect((screen.getByRole("button", { name: "Call staff" }) as HTMLButtonElement).disabled).toBe(false);
    });

    it("pressed again too soon: the server's answer is shown", async () => {
        server.use(
            openBill([placed]),
            http.post("*/api/orders/demo-bistro/tables/T1/requests", () =>
                HttpResponse.json(
                    { message: "You asked a moment ago. Someone will be with you soon.", code: "REQUEST_TOO_SOON" },
                    { status: 429 },
                ),
            ),
        );
        render(<TableRequests slug="demo-bistro" table="T1" />);
        fireEvent.click(await screen.findByRole("button", { name: "Call staff" }));
        expect(await screen.findByText("You asked a moment ago. Someone will be with you soon.")).toBeTruthy();
    });
});

describe("the cashier's badge (VM-30)", () => {
    it("shows BILL REQUESTED with how long ago, and STAFF CALLED", () => {
        const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
        render(
            <OrderCard order={{ ...bill, billRequestedAt: at(3), staffCalledAt: at(0) }} onMarkPaid={vi.fn()} onDismissRequest={vi.fn()} />,
        );
        expect(screen.getByText("BILL REQUESTED · 3 min")).toBeTruthy();
        expect(screen.getByText("STAFF CALLED · just now")).toBeTruthy();
    });

    it("Dismiss clears it", () => {
        const onDismiss = vi.fn();
        render(
            <OrderCard order={{ ...bill, billRequestedAt: new Date().toISOString() }} onMarkPaid={vi.fn()} onDismissRequest={onDismiss} />,
        );
        fireEvent.click(screen.getByRole("button", { name: "Dismiss bill request" }));
        expect(onDismiss).toHaveBeenCalledWith(bill._id, "bill");
    });

    it("no request, no badge", () => {
        render(<OrderCard order={bill} onMarkPaid={vi.fn()} />);
        expect(screen.queryByText(/REQUESTED|CALLED/)).toBeNull();
    });
});
