import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// VM-33: the customer menu and cart in Deep Lab: a solid forest band, a mono table chip, mono
// category tabs, dish cards with one round + button, a cart bar that says what's in the cart,
// 44 px quantity steppers, one coral Place order button, and dark mode.
vi.mock("next/navigation", () => ({
    useParams: () => ({ res: "demo-bistro", table: "T1" }),
    useRouter: () => ({ push: vi.fn() }),
    usePathname: () => "/demo-bistro/customer/T1",
}));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toast }));

const { default: MenuHeader } = await import("@/features/customer/components/menu/MenuHeader");
const { default: MenuCartBar } = await import("@/features/customer/components/menu/MenuCartBar");
const { default: ItemCard } = await import("@/features/customer/components/ItemCard");
const { default: CartItemCard } = await import("@/features/customer/components/CartItemCard");
const { default: CartBottomBar } = await import("@/features/customer/components/cart/CartBottomBar");
const { addToCart, cartKey } = await import("@/features/customer/cart");
const { DARK_READY } = await import("@/theme/ThemeSync");

const KUY = { _id: "665f00000000000000000011", name: "Kuy Teav", priceCents: 250, image: "/k.jpg", isEnabled: true };
const link = { slug: "demo-bistro", token: null, name: "T1", cartId: "T1", base: "/demo-bistro/customer/T1" };

beforeEach(() => localStorage.clear());

describe("menu header", () => {
    it("is a solid forest band with the restaurant's name and a mono table chip", () => {
        const { container } = render(<MenuHeader heading="Demo Bistro" nameLoaded table="T1" link={link} />);
        const header = container.querySelector("header")!;
        expect(header.className).toContain("vm-band");
        expect(screen.getByRole("heading", { level: 1, name: "Demo Bistro" }).className).toContain("font-[family-name:var(--f-display)]");
        const chip = screen.getByText("Table T1");
        expect(chip.className).toContain("font-[family-name:var(--f-mono)]");
        expect(chip.className).toContain("uppercase");
        expect(screen.getByRole("button", { name: /switch to dark theme/i })).toBeInTheDocument();
    });
});

describe("dish card", () => {
    it("has a lazy 4:3 photo, the price in mono, and one round + button named for the dish", () => {
        render(<ItemCard slug="demo-bistro" table="T1" {...KUY} />);
        const img = screen.getByRole("img", { name: "Kuy Teav" });
        expect(img).toHaveAttribute("loading", "lazy");
        expect(img.className).toContain("aspect-[4/3]");
        expect(screen.getByText("$2.50").className).toContain("font-[family-name:var(--f-mono)]");
        const add = screen.getByRole("button", { name: "Add to cart: Kuy Teav" });
        expect(add.className).toContain("rounded-full");
        expect(add.className).toContain("bg-[var(--accent)]");
        expect(screen.getAllByRole("button")).toHaveLength(1);
    });
});

describe("cart bar", () => {
    it("is hidden while the cart is empty", () => {
        const { container } = render(<MenuCartBar slug="demo-bistro" table="T1" cartHref="/demo-bistro/customer/T1/cart" />);
        expect(container).toBeEmptyDOMElement();
    });

    it("shows the count and total in mono and View order, and follows the cart", () => {
        addToCart("demo-bistro", "T1", { item: KUY, quantity: 2 });
        render(<MenuCartBar slug="demo-bistro" table="T1" cartHref="/demo-bistro/customer/T1/cart" />);
        expect(screen.getByText("2 items · $5.00")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /view order/i })).toHaveAttribute("href", "/demo-bistro/customer/T1/cart");
        act(() => addToCart("demo-bistro", "T1", { item: KUY, quantity: 1 }));
        expect(screen.getByText("3 items · $7.50")).toBeInTheDocument();
        expect(JSON.parse(localStorage.getItem(cartKey("demo-bistro", "T1"))!)[0].quantity).toBe(3);
    });
});

describe("cart page", () => {
    it("has 44 px steppers named for the dish", () => {
        const increase = vi.fn();
        render(
            <CartItemCard
                cartItem={{ item: KUY, quantity: 2 }}
                index={0}
                increaseQuantity={increase}
                decreaseQuantity={vi.fn()}
                removeItem={vi.fn()}
                setNote={vi.fn()}
            />,
        );
        for (const name of ["Decrease Kuy Teav", "Increase Kuy Teav", "Remove Kuy Teav"]) {
            const button = screen.getByRole("button", { name });
            expect(button.className).toContain("min-h-11");
            expect(button.className).toContain("min-w-11");
        }
        fireEvent.click(screen.getByRole("button", { name: "Increase Kuy Teav" }));
        expect(increase).toHaveBeenCalledWith(0);
    });

    it("has one coral Place order button next to the total", () => {
        render(<CartBottomBar orderError={null} hasItems itemCount={3} totalCents={750} isPlacingOrder={false} placeOrder={vi.fn()} />);
        expect(screen.getByRole("button", { name: /place order/i })).toHaveAttribute("data-variant", "primary");
        expect(screen.getByText("$7.50").className).toContain("font-[family-name:var(--f-mono)]");
    });
});

describe("dark mode", () => {
    const darkReady = (p: string) => new Function("p", `return ${DARK_READY}`)(p) as boolean;

    it("the menu, the cart and the order pages have dark styles", () => {
        for (const p of [
            "/demo-bistro/customer/T1",
            "/demo-bistro/customer/T1/cart",
            "/demo-bistro/customer/T1/orders/665f00000000000000000011",
            "/demo-bistro/t/abc",
            "/demo-bistro/t/abc/cart",
            "/demo-bistro/t/abc/orders/665f00000000000000000011",
        ])
            expect(darkReady(p), p).toBe(true);
        // the staff screens stay light until VM-34 and VM-35
        expect(darkReady("/demo-bistro/kitchen")).toBe(false);
        expect(darkReady("/demo-bistro/cashier/dashboard")).toBe(false);
        expect(darkReady("/owner")).toBe(false);
    });
});

describe("no effects", () => {
    const root = join(__dirname, "..", "..", "src", "features", "customer");
    const files = [
        "components/CustomerMenu.tsx",
        "components/ItemCard.tsx",
        "components/CartPage.tsx",
        "components/CartItemCard.tsx",
        "components/TableProblem.tsx",
        "components/OrderConfirmation.tsx",
        "components/TableRequests.tsx",
        "components/menu/MenuHeader.tsx",
        "components/menu/MenuToolbar.tsx",
        "components/menu/MenuCartBar.tsx",
        "components/menu/NoDishes.tsx",
        "components/cart/CartHeader.tsx",
        "components/cart/CartSummary.tsx",
        "components/cart/CartBottomBar.tsx",
        "components/cart/EmptyCart.tsx",
        "components/cart/KitchenNote.tsx",
        "cart.ts",
    ];

    it("no gradients, blur, hover scale, pulsing, big shadows, fixed colours or emoji", () => {
        const found: string[] = [];
        for (const f of files) {
            const src = readFileSync(join(root, f), "utf8");
            for (const bad of [
                /bg-gradient/,
                /backdrop-blur/,
                /hover:scale/,
                /animate-pulse/,
                /shadow-(lg|xl|2xl)/,
                /\b(?:bg|text|border|from|to|via)-(?:emerald|green|teal|gray|slate|zinc|red)-\d/,
                /\p{Extended_Pictographic}/u,
            ])
                if (bad.test(src)) found.push(`${f}: ${bad}`);
        }
        expect(found).toEqual([]);
    });
});
