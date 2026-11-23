import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { bill } from "../fixtures";
import { server } from "../msw";

// VM-24: one currency setting per restaurant, used by every price on every page, through one helper.
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }, ToastContainer: () => null }));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
vi.mock("next/navigation", () => ({
    useParams: () => ({ res: "demo-bistro", table: "1" }),
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));
const { default: CartPage } = await import("@/features/customer/components/CartPage");
const { default: OrderCard } = await import("@/features/cashier/components/orders/OrderCard");
const { MoneyProvider } = await import("@/components/money/MoneyProvider");

const riel = () =>
    server.use(
        http.get("*/api/restaurants/demo-bistro/settings", () =>
            HttpResponse.json({ name: "Demo Bistro", currency: "KHR", khrPerUsd: 4100, paymentQrUrl: null }),
        ),
    );

describe("the restaurant's currency on every page (VM-24)", () => {
    it("the customer's cart", async () => {
        riel();
        localStorage.setItem(
            "cart:demo-bistro:1",
            JSON.stringify([
                {
                    item: { _id: "665f00000000000000000011", name: "Kuy Teav", image: "/k.jpg", isEnabled: true, priceCents: 235 },
                    quantity: 3,
                },
            ]),
        );
        render(
            <MoneyProvider slug="demo-bistro">
                <CartPage />
            </MoneyProvider>,
        );
        expect(await screen.findByText("Total: ៛28,900")).toBeTruthy(); // 7.05 × 4,100 = 28,905
        expect(screen.getByText("៛9,600 each")).toBeTruthy(); // 2.35 × 4,100 = 9,635
    });

    it("the cashier's bill", async () => {
        riel();
        render(
            <MoneyProvider slug="demo-bistro">
                <OrderCard order={bill} onMarkPaid={vi.fn()} />
            </MoneyProvider>,
        );
        const total = screen.getByRole("group", { name: "Bill total" });
        expect(await within(total).findByText("៛20,500")).toBeTruthy(); // $5.00
    });

    it("without settings (or while they load) prices show in US dollars", () => {
        render(<OrderCard order={bill} onMarkPaid={vi.fn()} />);
        expect(screen.getAllByText("$5.00").length).toBeGreaterThan(0);
    });

    it("every restaurant page is inside the provider", () => {
        const layout = readFileSync(join(__dirname, "..", "..", "src", "app", "[res]", "layout.tsx"), "utf8");
        expect(layout).toMatch(/<MoneyProvider>/);
    });

    it("no component formats money itself: they all use useMoney()", () => {
        const src = join(__dirname, "..", "..", "src");
        const files = (dir: string): string[] =>
            readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : [join(dir, n)]));
        const direct = files(join(src, "features"))
            .concat(files(join(src, "app")))
            .filter((f) => f.endsWith(".tsx") && /\bformatMoney\b/.test(readFileSync(f, "utf8")));
        expect(direct.map((f) => f.slice(src.length + 1))).toEqual([]);
    });
});
