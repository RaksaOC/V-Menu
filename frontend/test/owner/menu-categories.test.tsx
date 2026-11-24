import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { answer } from "../api/helpers";

// VM-25: the owner manages categories and picks one per dish; the cashier filters by category.
vi.mock("next/navigation", () => ({ useParams: () => ({}), useRouter: () => ({ push: vi.fn() }) }));
const { ResContext } = await import("@/lib/restaurant-context");
const { default: CategoriesManager } = await import("@/features/restaurant/components/CategoriesManager");
const { default: ItemForm } = await import("@/features/restaurant/components/ItemForm");
const { default: Menu } = await import("@/features/restaurant/components/Menu");

const MAINS = { _id: "665f000000000000000000c1", name: "Mains", sortOrder: 0 };
const DRINKS = { _id: "665f000000000000000000c2", name: "Drinks", sortOrder: 1 };
const BASE = "/api/menu/demo-bistro/categories";

function manager() {
    const changed = vi.fn();
    answer("get", BASE, [MAINS, DRINKS]);
    render(<CategoriesManager slug="demo-bistro" categories={[MAINS, DRINKS]} onClose={vi.fn()} onChanged={changed} />);
    return changed;
}

describe("managing categories", () => {
    it("moves a category up: the whole new order is sent", async () => {
        const changed = manager();
        const seen = answer("put", `${BASE}/order`, [DRINKS, MAINS]);
        fireEvent.click(screen.getByRole("button", { name: "Move Drinks up" }));
        await waitFor(() => expect(seen[0]?.body).toEqual({ ids: [DRINKS._id, MAINS._id] }));
        await waitFor(() => expect(changed).toHaveBeenCalled());
        expect(screen.getByRole("button", { name: "Move Drinks up" })).toBeDisabled(); // now first
    });

    it("adds and renames categories", async () => {
        manager();
        const added = answer("post", BASE, { ...MAINS, _id: "665f000000000000000000c3", name: "Desserts" }, 201);
        fireEvent.change(screen.getByRole("textbox", { name: "New category" }), { target: { value: "Desserts" } });
        fireEvent.click(screen.getByRole("button", { name: "Add" }));
        await waitFor(() => expect(added[0]?.body).toEqual({ name: "Desserts" }));

        const renamed = answer("put", `${BASE}/${MAINS._id}`, { ...MAINS, name: "Main dishes" });
        fireEvent.click(screen.getByRole("button", { name: "Rename Mains" }));
        fireEvent.change(screen.getByRole("textbox", { name: "Name for Mains" }), { target: { value: "Main dishes" } });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));
        await waitFor(() => expect(renamed[0]?.body).toEqual({ name: "Main dishes" }));
    });

    it("deleting asks first, and says the dishes move to Other", async () => {
        manager();
        const removed = answer("delete", `${BASE}/${DRINKS._id}`, DRINKS);
        fireEvent.click(screen.getByRole("button", { name: "Delete Drinks" }));
        expect(screen.getByText(/dishes move to Other/i)).toBeInTheDocument();
        expect(removed).toHaveLength(0);
        fireEvent.click(screen.getByRole("button", { name: "Yes, delete Drinks" }));
        await waitFor(() => expect(removed).toHaveLength(1));
    });
});

describe("a dish's category", () => {
    it("the item form offers the categories, and Other for none", async () => {
        const onSave = vi.fn();
        render(<ItemForm categories={[MAINS, DRINKS]} onClose={vi.fn()} onSave={onSave} />);
        const select = screen.getByRole("combobox", { name: "Category" });
        expect(
            within(select)
                .getAllByRole("option")
                .map((o) => o.textContent),
        ).toEqual(["Other (no category)", "Mains", "Drinks"]);
        fireEvent.change(select, { target: { value: DRINKS._id } });
        fireEvent.change(screen.getByLabelText("Item Name"), { target: { value: "Iced Tea" } });
        fireEvent.change(screen.getByLabelText("Price ($)"), { target: { value: "1.5" } });
        fireEvent.submit(screen.getByRole("combobox", { name: "Category" }).closest("form")!);
        await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "Iced Tea", categoryId: DRINKS._id })));
    });
});

describe("the cashier's menu", () => {
    it("filters dishes by category", async () => {
        const dish = (n: string, categoryId: string | null) => ({
            _id: `665f0000000000000000000${n.length}`,
            name: n,
            priceCents: 100,
            image: "/x.png",
            isEnabled: true,
            categoryId,
        });
        answer("get", "/api/menu/demo-bistro/items", [dish("Fish Amok", MAINS._id), dish("Tea", DRINKS._id), dish("Bread", null)]);
        answer("get", BASE, [MAINS, DRINKS]);
        render(
            <ResContext.Provider value="demo-bistro">
                <Menu role="cashier" />
            </ResContext.Provider>,
        );
        const filter = await screen.findByRole("group", { name: "Filter by category" });
        expect(
            within(filter)
                .getAllByRole("button")
                .map((b) => b.textContent),
        ).toEqual(["All", "Mains", "Drinks", "Other"]);
        fireEvent.click(within(filter).getByRole("button", { name: "Drinks" }));
        expect(screen.getByText("Tea")).toBeInTheDocument();
        expect(screen.queryByText("Fish Amok")).not.toBeInTheDocument();
        fireEvent.click(within(filter).getByRole("button", { name: "Other" }));
        expect(screen.getByText("Bread")).toBeInTheDocument();
        expect(screen.queryByText("Tea")).not.toBeInTheDocument();
    });
});
