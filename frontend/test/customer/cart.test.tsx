import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CartItem } from "@/features/customer/cart";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("react-toastify", () => ({ toast, ToastContainer: () => null }));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));

const { addToCart, cartKey, readCart, reconcileCart } = await import("@/features/customer/cart");
const { default: Card } = await import("@/features/customer/components/ItemCard");

const kuyTeav = { _id: "665f00000000000000000011", name: "Kuy Teav", priceCents: 250, image: "/images/kuy-teav.jpg", isEnabled: true };
const lokLak = { _id: "665f00000000000000000012", name: "Lok Lak", priceCents: 400, image: "/images/lok-lak.jpg", isEnabled: true };
// VM-05: one cart per restaurant and table, stored under cart:<slug>:<table>.
const SLUG = "demo-bistro";
const T = "T1";
const saved = (slug = SLUG, table = T): CartItem[] => JSON.parse(localStorage.getItem(`cart:${slug}:${table}`) ?? "[]");
const add = (line: CartItem, slug = SLUG, table = T) => addToCart(slug, table, line);

describe("addToCart", () => {
    it("adds a new dish with its quantity and saves the cart", () => {
        add({ item: kuyTeav, quantity: 1 });
        expect(saved()).toEqual([{ item: kuyTeav, quantity: 1 }]);
        expect(toast.success).toHaveBeenCalledWith("Added to cart! 🛒", expect.any(Object));
    });

    it("adds one to a dish that is already in the cart", () => {
        add({ item: kuyTeav, quantity: 1 });
        add({ item: kuyTeav, quantity: 1 });
        expect(saved()).toEqual([{ item: kuyTeav, quantity: 2 }]);
        expect(toast.success).toHaveBeenLastCalledWith("Added to existing item!", expect.any(Object));
    });

    it("keeps different dishes apart, in the order they were added", () => {
        add({ item: kuyTeav, quantity: 1 });
        add({ item: lokLak, quantity: 1 });
        add({ item: kuyTeav, quantity: 1 });
        expect(saved().map((c) => [c.item.name, c.quantity])).toEqual([
            ["Kuy Teav", 2],
            ["Lok Lak", 1],
        ]);
    });

    it("keeps what an earlier page load saved", () => {
        localStorage.setItem(cartKey(SLUG, T), JSON.stringify([{ item: lokLak, quantity: 3 }]));
        add({ item: lokLak, quantity: 1 });
        expect(saved()).toEqual([{ item: lokLak, quantity: 4 }]);
    });
});

describe("one cart per restaurant and table (VM-05)", () => {
    it("keeps carts for different restaurants and tables separate", () => {
        add({ item: kuyTeav, quantity: 1 }, "a", "1");
        add({ item: lokLak, quantity: 1 }, "b", "2");
        add({ item: lokLak, quantity: 1 }, "a", "2");
        expect(saved("a", "1").map((c) => c.item.name)).toEqual(["Kuy Teav"]);
        expect(saved("b", "2").map((c) => c.item.name)).toEqual(["Lok Lak"]);
        expect(saved("a", "2").map((c) => c.item.name)).toEqual(["Lok Lak"]);
        expect(readCart("b", "1")).toEqual([]);
    });

    it("no longer uses the shared cartItems key, and drops what it left behind", () => {
        localStorage.setItem("cartItems", JSON.stringify([{ item: lokLak, quantity: 5 }]));
        localStorage.setItem("table", JSON.stringify("9"));
        expect(readCart(SLUG, T)).toEqual([]);
        expect(localStorage.getItem("cartItems")).toBeNull();
        expect(localStorage.getItem("table")).toBeNull();
    });

    it("drops dishes that are no longer on the menu, and refreshes the others", () => {
        localStorage.setItem(
            cartKey(SLUG, T),
            JSON.stringify([
                { item: kuyTeav, quantity: 2 },
                { item: lokLak, quantity: 1 },
            ]),
        );
        const newPrice = { ...kuyTeav, priceCents: 300 };
        expect(reconcileCart(SLUG, T, [newPrice])).toBe(1);
        expect(saved()).toEqual([{ item: newPrice, quantity: 2 }]);
        expect(reconcileCart(SLUG, T, [newPrice])).toBe(0);
    });
});

describe("menu item card", () => {
    it("shows the dish and adds one of it to the cart", () => {
        render(<Card slug={SLUG} table={T} _id={lokLak._id} name="Lok Lak" priceCents={400} image={lokLak.image} />);
        expect(screen.getByRole("heading", { name: "Lok Lak" })).toBeInTheDocument();
        expect(screen.getByText("$4.00")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));
        expect(saved()).toEqual([{ item: { ...lokLak }, quantity: 1 }]);
    });

    // Was a known bug (B1): the card stored parseInt(price.toFixed(2)), so $2.50 went into the
    // cart as $2. Fixed with VM-05's cart helpers; this was an \`it.fails\` until then.
    it("keeps the cents of the price", () => {
        render(<Card slug={SLUG} table={T} _id={kuyTeav._id} name="Kuy Teav" priceCents={250} image={kuyTeav.image} />);
        fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));
        expect(saved()[0].item.priceCents).toBe(250);
    });
});
