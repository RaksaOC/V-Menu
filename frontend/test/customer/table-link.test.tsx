import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../msw";

// SEC-04: a customer opens /<slug>/t/<token>. Every call uses the token; the browser never sends
// the table's name.
const TOKEN = "AbCdEfGhIjKlMnOpQrSt_-";
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }));
vi.mock("next/navigation", () => ({
    useParams: () => ({ res: "demo-bistro", token: "AbCdEfGhIjKlMnOpQrSt_-", orderId: "665f00000000000000abc123" }),
    useRouter: () => router,
}));
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
const { default: CustomerMenu } = await import("@/features/customer/components/CustomerMenu");
const { default: CartPage } = await import("@/features/customer/components/CartPage");
const { default: OrderConfirmation } = await import("@/features/customer/components/OrderConfirmation");

const DISH = { _id: "665f000000000000000000a1", name: "Fish Amok", price: 5.5, image: "/images/img.png", isEnabled: true };
const KEY = `cart:demo-bistro:${TOKEN}`;

function menu(link: () => Response) {
    server.use(
        http.get("*/api/restaurants/demo-bistro/public", () => HttpResponse.json({ name: "Demo Bistro", slug: "demo-bistro" })),
        http.get(`*/api/menu/demo-bistro/public/t/${TOKEN}`, link),
        http.get("*/api/menu/demo-bistro/public/items", () =>
            HttpResponse.json({ categories: [{ _id: null, name: "Other", items: [DISH] }] }),
        ),
    );
}

describe("the menu through a table's link (SEC-04)", () => {
    it("shows the table's name from the server, and keeps the cart under the token", async () => {
        menu(() => HttpResponse.json({ table: "T1", isOpen: true }));
        render(<CustomerMenu />);
        expect(await screen.findByText("Table T1")).toBeInTheDocument();
        fireEvent.click(await screen.findByRole("button", { name: /add to cart/i }));
        expect(JSON.parse(localStorage.getItem(KEY)!)[0].item._id).toBe(DISH._id);
        await waitFor(() => expect(document.title).toBe("Demo Bistro · Table T1"));
        expect(screen.getByRole("link", { name: /view cart/i })).toHaveAttribute("href", `/demo-bistro/t/${TOKEN}/cart`);
    });

    it("a closed table says so, by name", async () => {
        menu(() => HttpResponse.json({ table: "T4", isOpen: false }));
        render(<CustomerMenu />);
        expect(await screen.findByRole("heading", { name: "Table T4 isn't open yet" })).toBeInTheDocument();
    });

    it("a wrong or old link says to scan the code again", async () => {
        menu(() => HttpResponse.json({ code: "TABLE_LINK_INVALID", message: "This table link isn't valid." }, { status: 404 }));
        render(<CustomerMenu />);
        expect(await screen.findByRole("heading", { name: "This table link isn't valid" })).toBeInTheDocument();
        expect(screen.getByText(/scan the QR code on your table/i)).toBeInTheDocument();
        expect(screen.queryByRole("link", { name: /view cart/i })).not.toBeInTheDocument();
    });
});

describe("the cart through a table's link (SEC-04)", () => {
    it("sends the token and no table name, then opens the confirmation by token", async () => {
        localStorage.setItem(KEY, JSON.stringify([{ item: DISH, quantity: 2 }]));
        let sent: Record<string, unknown> | undefined;
        server.use(
            http.post("*/api/orders/demo-bistro", async ({ request }) => {
                sent = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({ _id: "o1" }, { status: 201 });
            }),
        );
        render(<CartPage />);
        fireEvent.click(await screen.findByRole("button", { name: /place order/i }));
        await waitFor(() => expect(sent).toEqual({ qrToken: TOKEN, orderedItems: [{ item: { _id: DISH._id }, quantity: 2 }] }));
        await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/demo-bistro/t/${TOKEN}/orders/o1`));
    });

    it("Back returns to the table's link", async () => {
        router.push.mockClear();
        render(<CartPage />);
        fireEvent.click(await screen.findByRole("button", { name: "Back" }));
        expect(router.push).toHaveBeenCalledWith(`/demo-bistro/t/${TOKEN}`);
    });
});

describe("the confirmation through a table's link (SEC-04)", () => {
    it("loads the order and bill by token, and Order more returns to the link", async () => {
        const order = {
            _id: "665f00000000000000abc123",
            number: "ABC123",
            status: "pending",
            table: "T1",
            placedAt: "2026-11-23T12:34:00.000Z",
            lines: [{ name: "Fish Amok", price: 5.5, quantity: 1, total: 5.5 }],
            total: 5.5,
        };
        server.use(
            http.get(`*/api/orders/demo-bistro/t/${TOKEN}/orders/:id`, () => HttpResponse.json(order)),
            http.get(`*/api/orders/demo-bistro/t/${TOKEN}/open-bill`, () =>
                HttpResponse.json({ table: "T1", orders: [order], total: 5.5 }),
            ),
        );
        render(<OrderConfirmation pollMs={60_000} />);
        expect(await screen.findByRole("heading", { name: "Order #ABC123 sent to the kitchen" })).toBeInTheDocument();
        expect(await screen.findByText("Table T1")).toBeInTheDocument(); // the server's name, not the URL's token
        expect(screen.queryByText(new RegExp(TOKEN))).not.toBeInTheDocument();
        expect(screen.getByRole("link", { name: /order more/i })).toHaveAttribute("href", `/demo-bistro/t/${TOKEN}`);
    });
});

describe("resetting a table's QR code (SEC-04)", () => {
    it("the owner confirms first, then the table gets a new link", async () => {
        const { answer } = await import("../api/helpers");
        const { ResContext } = await import("@/lib/restaurant-context");
        const { default: Tables } = await import("@/features/restaurant/components/Tables");
        const table = { _id: "665f000000000000000000b1", name: "T1", isEnabled: true, qrToken: TOKEN };
        answer("get", "/api/menu/demo-bistro/tables", [table]);
        answer("get", "/api/restaurants/demo-bistro/public", { name: "Demo Bistro", slug: "demo-bistro" });
        render(
            <ResContext.Provider value="demo-bistro">
                <Tables role="owner" />
            </ResContext.Provider>,
        );
        fireEvent.click(await screen.findByRole("button", { name: "Edit Table" }));
        const dialog = within(screen.getByRole("dialog"));
        const reset = answer("post", `/api/menu/demo-bistro/tables/${table._id}/qr-token`, { ...table, qrToken: "ZyXwVuTsRqPoNmLkJiHg_-" });
        fireEvent.click(dialog.getByRole("button", { name: "Reset QR code" }));
        expect(dialog.getByText(/old code stops working/i)).toBeInTheDocument();
        expect(reset).toHaveLength(0);
        fireEvent.click(dialog.getByRole("button", { name: "Yes, reset" }));
        await waitFor(() => expect(reset).toHaveLength(1));
    });
});
