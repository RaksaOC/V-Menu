import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { answer } from "../api/helpers";

// VM-26: the owner writes a description and picks tags; the owner's and cashier's menu show the
// same details and the same "Sold out" as the customer.
vi.mock("next/navigation", () => ({ useParams: () => ({}), useRouter: () => ({ push: vi.fn() }) }));
const { ResContext } = await import("@/lib/restaurant-context");
const { default: ItemForm } = await import("@/features/restaurant/components/ItemForm");
const { default: Menu } = await import("@/features/restaurant/components/Menu");
const { checkItem, DISH_TAGS } = await import("@/features/restaurant/item-rules");
const contracts = await import("@vmenu/contracts");

const DISH = {
    _id: "665f0000000000000000d001",
    name: "Amok",
    price: 5,
    image: "/images/img.png",
    isEnabled: true,
    description: "Fish curry",
    tags: ["spicy"],
};
const submit = () => fireEvent.submit(screen.getByLabelText("Item Name").closest("form")!);

describe("the item form (VM-26)", () => {
    it("saves a description and the ticked tags", async () => {
        const onSave = vi.fn();
        render(<ItemForm onClose={vi.fn()} onSave={onSave} />);
        fireEvent.change(screen.getByLabelText("Item Name"), { target: { value: "Amok" } });
        fireEvent.change(screen.getByLabelText("Price ($)"), { target: { value: "5" } });
        fireEvent.change(screen.getByLabelText("Description (optional)"), { target: { value: "  Fish curry  " } });
        fireEvent.click(screen.getByRole("checkbox", { name: "spicy" }));
        fireEvent.click(screen.getByRole("checkbox", { name: "vegetarian" }));
        fireEvent.click(screen.getByRole("checkbox", { name: "vegetarian" })); // changed their mind
        fireEvent.click(screen.getByRole("checkbox", { name: "contains nuts" }));
        submit();
        await waitFor(() =>
            expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ description: "Fish curry", tags: ["spicy", "contains nuts"] })),
        );
    });

    it("editing a dish starts from its details, and they can be cleared", async () => {
        const onSave = vi.fn();
        render(<ItemForm item={DISH} onClose={vi.fn()} onSave={onSave} />);
        expect(screen.getByLabelText("Description (optional)")).toHaveValue("Fish curry");
        expect(screen.getByRole("checkbox", { name: "spicy" })).toBeChecked();
        fireEvent.change(screen.getByLabelText("Description (optional)"), { target: { value: "" } });
        fireEvent.click(screen.getByRole("checkbox", { name: "spicy" }));
        submit();
        await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ description: "", tags: [] })));
    });

    it("a description over 300 characters is explained, and nothing is sent", async () => {
        const onSave = vi.fn();
        render(<ItemForm item={DISH} onClose={vi.fn()} onSave={onSave} />);
        fireEvent.change(screen.getByLabelText("Description (optional)"), { target: { value: "x".repeat(301) } });
        submit();
        await waitFor(() => expect(screen.getByLabelText("Description (optional)")).toHaveAccessibleDescription("At most 300 characters"));
        expect(onSave).not.toHaveBeenCalled();
    });

    it("the browser's tag list and description rule are the server's", () => {
        expect(DISH_TAGS).toEqual(contracts.DISH_TAGS);
        for (const description of ["", "   ", "Hot", "x".repeat(300), "x".repeat(301), ` ${"x".repeat(300)} `]) {
            const server = contracts.UpdateItemBody.safeParse({ description });
            expect(checkItem({ name: "A", price: "1", description }).description).toBe(server.error?.issues[0].message);
        }
    });
});

describe("the staff menu (VM-26)", () => {
    function menu(role: "owner" | "cashier", dishes: object[]) {
        answer("get", "/api/menu/demo-bistro/items", dishes as never);
        answer("get", "/api/menu/demo-bistro/categories", []);
        render(
            <ResContext.Provider value="demo-bistro">
                <Menu role={role} />
            </ResContext.Provider>,
        );
    }

    it("shows the description and tags", async () => {
        menu("cashier", [DISH]);
        const card = within((await screen.findByRole("heading", { name: "Amok" })).closest("article") as HTMLElement);
        expect(card.getByText("Fish curry")).toBeInTheDocument();
        expect(card.getByText("spicy")).toBeInTheDocument();
        expect(card.getByText("Available")).toBeInTheDocument();
    });

    it("a switched-off dish says Sold out, as the customer sees it", async () => {
        menu("owner", [{ ...DISH, isEnabled: false }]);
        const card = within((await screen.findByRole("heading", { name: "Amok" })).closest("article") as HTMLElement);
        expect(card.getByText("Sold out")).toBeInTheDocument();
        expect(card.queryByText("Disabled")).not.toBeInTheDocument();
    });
});
