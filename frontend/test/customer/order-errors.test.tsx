import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../msw";

// VM-06: when an order fails, the customer sees why, keeps the cart, and can try again.
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("react-toastify", () => ({ toast, ToastContainer: () => null }));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
const router = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn() }));
vi.mock("next/navigation", () => ({ useParams: () => ({ res: "demo-bistro", table: "1" }), useRouter: () => router }));

const { default: CartPage } = await import("@/features/customer/components/CartPage");

const kuyTeav = { _id: "665f00000000000000000011", name: "Kuy Teav", price: 2.5, image: "/k.jpg", isEnabled: true };
const lokLak = { _id: "665f00000000000000000012", name: "Lok Lak", price: 4, image: "/l.jpg", isEnabled: true };
const KEY = "cart:demo-bistro:1";
const seed = () =>
    localStorage.setItem(
        KEY,
        JSON.stringify([
            { item: kuyTeav, quantity: 2 },
            { item: lokLak, quantity: 1 },
        ]),
    );
const cart = () => JSON.parse(localStorage.getItem(KEY) ?? "[]") as { item: { name: string } }[];
const order = (status: number, body: object) =>
    server.use(http.post("*/api/orders/demo-bistro", () => HttpResponse.json(body, { status })));

async function placeOrder() {
    render(<CartPage />);
    await screen.findByText("Kuy Teav");
    fireEvent.click(screen.getByRole("button", { name: /place order/i }));
    return screen.findByRole("alert");
}

describe("order errors", () => {
    it("a closed table: says so, keeps the cart, no retry", async () => {
        seed();
        order(409, { message: "Table is not available", code: "TABLE_CLOSED" });
        const alert = await placeOrder();
        expect(alert).toHaveTextContent("Table is not available");
        expect(within(alert).queryByRole("button", { name: /try again/i })).toBeNull();
        expect(cart()).toHaveLength(2);
        expect(router.back).not.toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalledWith(expect.stringMatching(/Failed to place order/));
    });

    it("dishes no longer available: reloads the menu and takes those dishes out of the cart", async () => {
        seed();
        order(409, { message: "Some items are no longer available", code: "ITEMS_UNAVAILABLE" });
        server.use(
            http.get("*/api/menu/demo-bistro/public/items", () =>
                HttpResponse.json({ categories: [{ _id: null, name: "Other", items: [kuyTeav] }] }),
            ),
        ); // Lok Lak is off (VM-25: grouped)
        const alert = await placeOrder();
        await waitFor(() => expect(alert).toHaveTextContent(/Some items are no longer available/));
        await waitFor(() => expect(alert).toHaveTextContent(/Lok Lak/));
        expect(cart().map((l) => l.item.name)).toEqual(["Kuy Teav"]);
        await waitFor(() => expect(screen.queryByText("Lok Lak", { selector: "h3, h4, p, span" })).toBeNull());
    });

    it("the service is down: shows the message and Try again, which sends the same cart again", async () => {
        seed();
        let calls = 0;
        server.use(
            http.post("*/api/orders/demo-bistro", () =>
                ++calls === 1
                    ? HttpResponse.json({ message: "A required service is unavailable" }, { status: 503 })
                    : HttpResponse.json({ _id: "o1" }, { status: 201 }),
            ),
        );
        const alert = await placeOrder();
        expect(alert).toHaveTextContent("A required service is unavailable");
        expect(cart()).toHaveLength(2);
        fireEvent.click(within(alert).getByRole("button", { name: /try again/i }));
        await waitFor(() => expect(router.push).toHaveBeenCalledWith("/demo-bistro/customer/1/orders/o1"));
        expect(calls).toBe(2);
        await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    });

    it("no connection: says so, keeps the cart, offers Try again", async () => {
        seed();
        server.use(http.post("*/api/orders/demo-bistro", () => HttpResponse.error()));
        const alert = await placeOrder();
        expect(alert).toHaveTextContent(/couldn't reach|connection/i);
        expect(within(alert).getByRole("button", { name: /try again/i })).toBeTruthy();
        expect(cart()).toHaveLength(2);
    });

    it("any other error shows the server's message", async () => {
        seed();
        order(400, { message: "Quantity must be 1 to 99" });
        expect(await placeOrder()).toHaveTextContent("Quantity must be 1 to 99");
        expect(cart()).toHaveLength(2);
    });
});
