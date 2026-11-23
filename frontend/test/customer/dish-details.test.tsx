import { fireEvent, render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../msw";

// VM-26: the customer sees a dish's description and tags, and a switched-off dish stays on the
// menu, greyed out and marked SOLD OUT, with no way to add it.
vi.mock("next/navigation", () => ({ useParams: () => ({ res: "demo-bistro", table: "T1" }), useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toast }));
const { default: CustomerMenu } = await import("@/features/customer/components/CustomerMenu");
const { cartKey } = await import("@/features/customer/cart");

const AMOK = {
    _id: "665f000000000000000000a1",
    name: "Fish Amok",
    price: 5.5,
    image: "/images/img.png",
    isEnabled: true,
    description: "Steamed fish curry in banana leaf",
    tags: ["spicy", "contains nuts"],
};
const RICE = { _id: "665f000000000000000000a2", name: "Fried Rice", price: 3.5, image: "/images/img.png", isEnabled: false };

function open() {
    server.use(
        http.get("*/api/restaurants/demo-bistro/public", () => HttpResponse.json({ name: "Demo Bistro", slug: "demo-bistro" })),
        http.get("*/api/menu/demo-bistro/public/tables/:t", () => HttpResponse.json({ message: "Table is available" })),
        http.get("*/api/menu/demo-bistro/public/items", () =>
            HttpResponse.json({ categories: [{ _id: null, name: "Other", items: [AMOK, RICE] }] }),
        ),
    );
    render(<CustomerMenu />);
}
const cardOf = async (name: string) => (await screen.findByRole("heading", { name })).closest("article") as HTMLElement;

describe("a dish on the customer menu (VM-26)", () => {
    it("shows its description and its tags as labels", async () => {
        open();
        const card = within(await cardOf("Fish Amok"));
        expect(card.getByText("Steamed fish curry in banana leaf")).toBeInTheDocument();
        expect(card.getByText("spicy")).toBeInTheDocument();
        expect(card.getByText("contains nuts")).toBeInTheDocument();
        expect(card.getByRole("button", { name: /add/i })).toBeEnabled();
        expect(card.queryByText("SOLD OUT")).not.toBeInTheDocument();
    });

    it("a dish with no description or tags shows neither", async () => {
        open();
        const card = await cardOf("Fried Rice");
        expect(card.querySelector("[data-dish-description]")).toBeNull();
        expect(within(card).queryByRole("list", { name: "Dish tags" })).not.toBeInTheDocument();
    });

    it("a sold-out dish is greyed, says SOLD OUT, and has no Add button", async () => {
        open();
        const card = await cardOf("Fried Rice");
        expect(within(card).getByText("SOLD OUT")).toBeInTheDocument();
        expect(within(card).queryByRole("button")).not.toBeInTheDocument();
        expect(card).toHaveAttribute("data-sold-out", "true");
    });

    it("a dish in the cart that has sold out leaves the cart", async () => {
        localStorage.setItem(cartKey("demo-bistro", "T1"), JSON.stringify([{ item: RICE, quantity: 1 }]));
        open();
        await cardOf("Fried Rice");
        await vi.waitFor(() => expect(localStorage.getItem(cartKey("demo-bistro", "T1"))).toBeNull());
        expect(toast.info).toHaveBeenCalledWith(expect.stringMatching(/no longer available/));
    });

    it("adding a dish still works", async () => {
        open();
        fireEvent.click(within(await cardOf("Fish Amok")).getByRole("button", { name: /add/i }));
        expect(JSON.parse(localStorage.getItem(cartKey("demo-bistro", "T1"))!)[0]).toMatchObject({ quantity: 1, item: { _id: AMOK._id } });
    });
});
