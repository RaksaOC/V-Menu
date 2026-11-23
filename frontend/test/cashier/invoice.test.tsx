import { fireEvent, render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { bill } from "../fixtures";
import { server } from "../msw";

// VM-24: the printed invoice has the restaurant's real details, the server's lines and totals, the
// owner's payment QR (or none: no more placeholder), and prices in the restaurant's currency.
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("next/navigation", () => ({ useParams: () => ({ res: "demo-bistro" }), useRouter: () => ({ push: vi.fn() }) }));
const { default: OrderCard } = await import("@/features/cashier/components/orders/OrderCard");
const { MoneyProvider } = await import("@/components/money/MoneyProvider");

const QR = `/api/menu/demo-bistro/images/${"a".repeat(24)}`;
function settings(extra: object = {}) {
    server.use(
        http.get("*/api/restaurants/demo-bistro/settings", () =>
            HttpResponse.json({ name: "Demo Bistro", currency: "USD", khrPerUsd: 4100, paymentQrUrl: null, ...extra }),
        ),
    );
}
async function openInvoice() {
    render(
        <MoneyProvider slug="demo-bistro">
            <OrderCard order={bill} onMarkPaid={vi.fn()} />
        </MoneyProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "View Invoice" }));
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByText("Demo Bistro");
    return within(dialog);
}

describe("the invoice (VM-24)", () => {
    it("shows the restaurant, table, bill number, date and time, lines, subtotal and total", async () => {
        settings();
        const invoice = await openInvoice();
        expect(invoice.getByRole("heading", { name: "Invoice #000041" })).toBeTruthy();
        expect(invoice.getByText("Table T1")).toBeTruthy();
        expect(invoice.getByText(/\d{1,2} \w{3} \d{4}, \d{1,2}:\d{2} [AP]M/)).toBeTruthy();
        const row = invoice.getByText("Kuy Teav").closest("tr")!;
        expect(within(row).getByText("2")).toBeTruthy();
        expect(within(row).getByText("$2.50")).toBeTruthy();
        expect(within(invoice.getByText("Subtotal").closest("div")!).getByText("$5.00")).toBeTruthy();
        expect(within(invoice.getByText("Total").closest("div")!).getByText("$5.00")).toBeTruthy();
    });

    it("has no placeholder QR, address or phone", async () => {
        settings();
        const invoice = await openInvoice();
        expect(invoice.queryByRole("img")).toBeNull();
        expect(invoice.queryByText(/Address will be supported soon/)).toBeNull();
        expect(invoice.queryByText("(123) 456-7890")).toBeNull();
    });

    it("shows the owner's payment QR when there is one", async () => {
        settings({ paymentQrUrl: QR });
        const invoice = await openInvoice();
        expect((await invoice.findByRole("img", { name: "Scan to pay" })).getAttribute("src")).toBe(QR);
    });

    it("prices are in the restaurant's currency", async () => {
        settings({ currency: "both", khrPerUsd: 4000 });
        const invoice = await openInvoice();
        expect(await invoice.findAllByText("$5.00 · ៛20,000")).toHaveLength(2); // subtotal and total
    });

    it("prints only the invoice", async () => {
        settings();
        const invoice = await openInvoice();
        expect(invoice.getByText("Demo Bistro").closest("[data-print]")).toBeTruthy();
    });
});
