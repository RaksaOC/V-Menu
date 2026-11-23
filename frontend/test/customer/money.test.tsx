import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// CL-07: the cart adds up whole cents, and a cart saved before CL-07 still works.
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }, ToastContainer: () => null }));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
vi.mock("next/navigation", () => ({
    useParams: () => ({ res: "demo-bistro", table: "1" }),
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));
const { default: CartPage } = await import("@/features/customer/components/CartPage");
const { readCart } = await import("@/features/customer/cart");
const { default: ItemForm } = await import("@/features/restaurant/components/ItemForm");

const KEY = "cart:demo-bistro:1";
const dish = { _id: "665f00000000000000000011", name: "Kuy Teav", image: "/k.jpg", isEnabled: true };

describe("the cart in cents (CL-07)", () => {
    it("3 x $2.35 is exactly $7.05", async () => {
        localStorage.setItem(KEY, JSON.stringify([{ item: { ...dish, priceCents: 235 }, quantity: 3 }]));
        render(<CartPage />);
        await screen.findByText("Kuy Teav");
        expect(screen.getByText("$2.35 each")).toBeTruthy();
        expect(screen.getByText("Total: $7.05")).toBeTruthy();
    });

    it("a cart saved before CL-07, with prices in dollars, is read as cents", () => {
        localStorage.setItem(KEY, JSON.stringify([{ item: { ...dish, price: 2.35 }, quantity: 3 }]));
        expect(readCart("demo-bistro", "1")[0].item.priceCents).toBe(235);
    });
});

describe("the dish form in cents (CL-07)", () => {
    it("takes dollars and saves whole cents", async () => {
        const onSave = vi.fn();
        const { container } = render(<ItemForm onClose={vi.fn()} onSave={onSave} />);
        const [name, price] = [
            container.ownerDocument.querySelector("input[type=text]")!,
            container.ownerDocument.querySelector("input[type=number]")!,
        ];
        fireEvent.change(name, { target: { value: "Amok" } });
        fireEvent.change(price, { target: { value: "2.35" } });
        fireEvent.submit(container.ownerDocument.querySelector("form")!);
        await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(onSave.mock.calls[0][0]).toMatchObject({ name: "Amok", priceCents: 235 });
        expect(onSave.mock.calls[0][0]).not.toHaveProperty("price");
    });

    it("shows a dish's price in dollars when editing", () => {
        const { container } = render(<ItemForm item={{ ...dish, priceCents: 235 }} onClose={vi.fn()} onSave={vi.fn()} />);
        expect((container.ownerDocument.querySelector("input[type=number]") as HTMLInputElement).value).toBe("2.35");
    });
});
