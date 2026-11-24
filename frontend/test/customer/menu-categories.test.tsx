import { fireEvent, render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../msw";

// VM-25: the customer's menu in sections, with category tabs and a search box.
vi.mock("next/navigation", () => ({ useParams: () => ({ res: "demo-bistro", table: "T1" }), useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
const { default: CustomerMenu } = await import("@/features/customer/components/CustomerMenu");

const dish = (_id: string, name: string, categoryId: string | null) => ({
    _id,
    name,
    price: 2,
    image: "/images/img.png",
    isEnabled: true,
    categoryId,
});
const MENU = {
    categories: [
        {
            _id: "665f000000000000000000c1",
            name: "Mains",
            items: [
                dish("665f000000000000000000a1", "Fish Amok", "665f000000000000000000c1"),
                dish("665f000000000000000000a2", "Fried Rice", "665f000000000000000000c1"),
            ],
        },
        {
            _id: "665f000000000000000000c2",
            name: "Drinks",
            items: [dish("665f000000000000000000a3", "Iced Coffee", "665f000000000000000000c2")],
        },
        { _id: null, name: "Other", items: [dish("665f000000000000000000a4", "Bread", null)] },
    ],
};

const scrolled = vi.fn();
beforeEach(() => {
    Element.prototype.scrollIntoView = scrolled; // jsdom has no layout
    localStorage.clear();
    server.use(
        http.get("*/api/menu/demo-bistro/public/tables/:t", () => HttpResponse.json({ message: "Table is available" })),
        http.get("*/api/menu/demo-bistro/public/items", () => HttpResponse.json(MENU)),
    );
});

describe("customer menu categories", () => {
    it("shows a section per category, in the menu's order, with a heading", async () => {
        render(<CustomerMenu />);
        const sections = within(await screen.findByRole("main")).getAllByRole("region");
        expect(sections.map((s) => within(s).getByRole("heading", { level: 3 }).textContent)).toEqual(["Mains", "Drinks", "Other"]);
        expect(within(screen.getByRole("region", { name: "Drinks" })).getByText("Iced Coffee")).toBeInTheDocument();
    });

    it("tapping a tab scrolls to that section", async () => {
        render(<CustomerMenu />);
        const tabs = await screen.findByRole("navigation", { name: "Menu categories" });
        fireEvent.click(within(tabs).getByRole("button", { name: "Drinks" }));
        expect(scrolled).toHaveBeenCalledTimes(1);
        expect(scrolled.mock.contexts[0]).toBe(screen.getByRole("region", { name: "Drinks" }));
        expect(within(tabs).getByRole("button", { name: "Drinks" })).toHaveAttribute("aria-current", "true");
    });

    it("the search box filters dishes by name, and says when nothing matches", async () => {
        render(<CustomerMenu />);
        const search = await screen.findByRole("searchbox", { name: "Search dishes" });
        fireEvent.change(search, { target: { value: "COFF" } });
        expect(screen.getByText("Iced Coffee")).toBeInTheDocument();
        expect(screen.queryByText("Fish Amok")).not.toBeInTheDocument();
        expect(
            within(screen.getByRole("main"))
                .getAllByRole("region")
                .map((s) => within(s).getByRole("heading", { level: 3 }).textContent),
        ).toEqual(["Drinks"]);
        fireEvent.change(search, { target: { value: "pizza" } });
        expect(screen.getByText(/No dishes match “pizza”/)).toBeInTheDocument();
    });
});
