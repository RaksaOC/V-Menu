import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../msw";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("react-toastify", () => ({ toast, ToastContainer: () => null }));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
const router = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn() }));
vi.mock("next/navigation", () => ({
    useParams: () => ({ res: "demo-bistro", table: "1" }),
    useRouter: () => router,
}));

const { default: CartPage } = await import("@/features/customer/components/CartPage");

const kuyTeav = { _id: "665f00000000000000000011", name: "Kuy Teav", price: 2.5, image: "/k.jpg", isEnabled: true };
const lokLak = { _id: "665f00000000000000000012", name: "Lok Lak", price: 4, image: "/l.jpg", isEnabled: true };

function seedCart() {
    localStorage.setItem("cartItems", JSON.stringify([{ item: kuyTeav, quantity: 2 }, { item: lokLak, quantity: 1 }]));
    localStorage.setItem("table", JSON.stringify("1"));
}
const placeOrder = () => fireEvent.click(screen.getByRole("button", { name: /place order/i }));

describe("cart page", () => {
    it("shows the saved cart with its total", async () => {
        seedCart();
        render(<CartPage />);
        expect(await screen.findByText("Kuy Teav")).toBeInTheDocument();
        expect(screen.getByText("Lok Lak")).toBeInTheDocument();
        expect(screen.getByText("Total: $9.00")).toBeInTheDocument();
        expect(screen.getByText("3 items")).toBeInTheDocument();
    });

    it("says the cart is empty when nothing was added", () => {
        render(<CartPage />);
        expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
    });

    it("sends the order for this restaurant and table", async () => {
        seedCart();
        let body: { table?: string; orderedItems?: { quantity: number }[] } = {};
        server.use(
            http.post("*/api/orders/demo-bistro", async ({ request }) => {
                body = (await request.json()) as typeof body;
                return HttpResponse.json({ _id: "o1" }, { status: 201 });
            }),
        );
        render(<CartPage />);
        await screen.findByText("Kuy Teav");
        placeOrder();
        await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Order placed successfully!", expect.any(Object)));
        expect(body.table).toBe("1");
        expect(body.orderedItems?.map((l) => l.quantity)).toEqual([2, 1]);
    });

    // Today every failure shows the same message, whatever the server said (VM-06 changes this:
    // update this test there to expect the server's message).
    it("shows an error when the order fails", async () => {
        seedCart();
        server.use(http.post("*/api/orders/demo-bistro", () => HttpResponse.json({ message: "This table is closed" }, { status: 409 })));
        render(<CartPage />);
        await screen.findByText("Kuy Teav");
        placeOrder();
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to place order. Please try again.", expect.any(Object)));
        expect(toast.success).not.toHaveBeenCalled();
        expect(JSON.parse(localStorage.getItem("cartItems")!)).toHaveLength(2); // the cart is kept
    });

    it("updates the total when a quantity changes", async () => {
        localStorage.setItem("cartItems", JSON.stringify([{ item: lokLak, quantity: 1 }]));
        render(<CartPage />);
        await screen.findByText("Lok Lak");
        const plus = screen.getAllByRole("button").find((b) => b.textContent === "" && b.querySelector("svg.lucide-plus"));
        fireEvent.click(plus!);
        expect(screen.getByText("Total: $8.00")).toBeInTheDocument();
        expect(JSON.parse(localStorage.getItem("cartItems")!)[0].quantity).toBe(2);
    });
});
