import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Bill } from "@vmenu/contracts";

// VM-31: the cashier's card and the invoice show the server's numbers. These totals are deliberately
// not what the lines add up to, so a page that worked them out itself would fail.
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("next/navigation", () => ({ useParams: () => ({ res: "demo-bistro" }), useRouter: () => ({ push: vi.fn() }) }));
const { default: OrderCard } = await import("@/features/cashier/components/orders/OrderCard");

const dish = { _id: "665f00000000000000000011", name: "Amok", priceCents: 235, image: "/a.jpg", isEnabled: true };
const bill: Bill = {
    _id: "665f00000000000000000041",
    table: "T1",
    isPaid: false,
    createdAt: "2026-11-23T10:00:00.000Z",
    orders: [
        {
            _id: "665f00000000000000000031",
            table: "T1",
            status: "pending",
            createdAt: "2026-11-23T10:00:00.000Z",
            orderedItems: [{ item: dish, quantity: 1 }],
        },
        {
            _id: "665f00000000000000000032",
            table: "T1",
            status: "pending",
            createdAt: "2026-11-23T10:01:00.000Z",
            orderedItems: [{ item: dish, quantity: 2 }],
        },
    ],
    lines: [{ _id: dish._id, name: "Amok (server)", priceCents: 235, quantity: 3, totalCents: 777 }],
    subtotalCents: 888,
    totalCents: 999,
};

describe("the server's totals (VM-31)", () => {
    it("the bill's card shows its total", () => {
        render(<OrderCard order={bill} onMarkPaid={vi.fn()} />);
        expect(within(screen.getByLabelText("Bill total")).getByText("$9.99")).toBeTruthy();
    });

    it("the invoice shows the server's merged lines, subtotal and total", () => {
        render(<OrderCard order={bill} onMarkPaid={vi.fn()} />);
        fireEvent.click(screen.getByRole("button", { name: "View Invoice" }));
        const invoice = within(screen.getByRole("dialog"));
        const row = invoice.getByText("Amok (server)").closest("tr")!;
        expect(within(row).getByText("3")).toBeTruthy();
        expect(within(row).getByText("$2.35")).toBeTruthy();
        expect(within(row).getByText("$7.77")).toBeTruthy();
        expect(within(invoice.getByText("Subtotal").closest("div")!).getByText("$8.88")).toBeTruthy();
        expect(within(invoice.getByText("Total").closest("div")!).getByText("$9.99")).toBeTruthy();
    });
});
