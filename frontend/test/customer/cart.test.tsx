import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CartItem } from "@/app/shared/types/CartItem";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("react-toastify", () => ({ toast, ToastContainer: () => null }));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));

const { addToCart, default: Card } = await import("@/app/[res]/customer/[table]/ItemCard");

const kuyTeav = { _id: "665f00000000000000000011", name: "Kuy Teav", price: 2.5, image: "/images/kuy-teav.jpg", isEnabled: true };
const lokLak = { _id: "665f00000000000000000012", name: "Lok Lak", price: 4, image: "/images/lok-lak.jpg", isEnabled: true };
const saved = (): CartItem[] => JSON.parse(localStorage.getItem("cartItems") ?? "[]");

describe("addToCart", () => {
    it("adds a new dish with its quantity and saves the cart", () => {
        addToCart({ item: kuyTeav, quantity: 1 });
        expect(saved()).toEqual([{ item: kuyTeav, quantity: 1 }]);
        expect(toast.success).toHaveBeenCalledWith("Added to cart! 🛒", expect.any(Object));
    });

    it("adds one to a dish that is already in the cart", () => {
        addToCart({ item: kuyTeav, quantity: 1 });
        addToCart({ item: kuyTeav, quantity: 1 });
        expect(saved()).toEqual([{ item: kuyTeav, quantity: 2 }]);
        expect(toast.success).toHaveBeenLastCalledWith("Added to existing item!", expect.any(Object));
    });

    it("keeps different dishes apart, in the order they were added", () => {
        addToCart({ item: kuyTeav, quantity: 1 });
        addToCart({ item: lokLak, quantity: 1 });
        addToCart({ item: kuyTeav, quantity: 1 });
        expect(saved().map((c) => [c.item.name, c.quantity])).toEqual([
            ["Kuy Teav", 2],
            ["Lok Lak", 1],
        ]);
    });

    it("keeps what an earlier page load saved", () => {
        localStorage.setItem("cartItems", JSON.stringify([{ item: lokLak, quantity: 3 }]));
        addToCart({ item: lokLak, quantity: 1 });
        expect(saved()).toEqual([{ item: lokLak, quantity: 4 }]);
    });
});

describe("menu item card", () => {
    it("shows the dish and adds one of it to the cart", () => {
        render(<Card _id={lokLak._id} name="Lok Lak" price={4} image={lokLak.image} />);
        expect(screen.getByRole("heading", { name: "Lok Lak" })).toBeInTheDocument();
        expect(screen.getByText("$4.00")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));
        expect(saved()).toEqual([{ item: { ...lokLak }, quantity: 1 }]);
    });

    // Known bug, found while writing B1: the card stores parseInt(price.toFixed(2)), so
    // $2.50 goes into the cart as $2 and the cart total is wrong (the server re-prices the
    // order, so the bill itself is right). `it.fails` keeps CI green until it is fixed; the
    // fix (with VM-05's cart helpers) must turn this into a normal `it`.
    it.fails("keeps the cents of the price (bug: they are dropped)", () => {
        render(<Card _id={kuyTeav._id} name="Kuy Teav" price={2.5} image={kuyTeav.image} />);
        fireEvent.click(screen.getByRole("button", { name: /add to cart/i }));
        expect(saved()[0].item.price).toBe(2.5);
    });
});
