import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { answer } from "../api/helpers";

// VM-17: the Add and Edit item popups check the same rules as the server before sending, and
// show the server's answer for a field next to that field instead of a toast.
vi.mock("next/navigation", () => ({ useParams: () => ({}), useRouter: () => ({ push: vi.fn() }) }));
const { ResContext } = await import("@/lib/restaurant-context");
const { default: ItemForm } = await import("@/features/restaurant/components/ItemForm");
const { default: Menu } = await import("@/features/restaurant/components/Menu");
const { checkItem } = await import("@/features/restaurant/item-rules");
const { CreateItemBody } = await import("@vmenu/contracts");
const { toCents } = await import("@/lib/money");

const field = (name: string) => screen.getByLabelText(name);
const type = (name: string, value: string) => fireEvent.change(field(name), { target: { value } });
const submit = () => fireEvent.submit(field("Item Name").closest("form")!);

describe("checks in the browser, the same as the server's (VM-17)", () => {
    it.each([
        ["Item Name", "Required", "", "5"],
        ["Item Name", "At most 120 characters", "x".repeat(121), "5"],
        ["Price ($)", "Required", "Amok", ""],
        ["Price ($)", "Must be 0 or more", "Amok", "-1"],
    ])("'%s' says '%s' before anything is sent", async (label, message, name, price) => {
        const onSave = vi.fn();
        render(<ItemForm onClose={vi.fn()} onSave={onSave} />);
        type("Item Name", name);
        type("Price ($)", price);
        submit();
        await waitFor(() => expect(field(label)).toHaveAccessibleDescription(message));
        expect(onSave).not.toHaveBeenCalled();
    });

    it("what the server accepts, the form accepts too: a one-letter name and a price of 0", async () => {
        const onSave = vi.fn();
        render(<ItemForm onClose={vi.fn()} onSave={onSave} />);
        type("Item Name", "B");
        type("Price ($)", "0");
        submit();
        await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "B", priceCents: 0 })));
    });
});

describe("the browser's checks are the server's rules (VM-17)", () => {
    // The bundle takes only types from @vmenu/contracts, so the rules are written out twice.
    // This keeps the copy honest: same verdict, same message, for each field.
    const names = ["Amok", "B", "", "   ", "  Amok  ", "x".repeat(120), "x".repeat(121)];
    const prices = [
        "5",
        "0",
        "2.35",
        "",
        " ",
        "-1",
        "-0.01",
        "-1.555",
        "2.555",
        "0.001",
        "1e300",
        "abc",
        "1e999",
        "0x10",
        " 7 ",
        "1000000",
        "1000000.01",
    ];
    it.each(names.flatMap((name) => prices.map((price) => [name.length > 20 ? `${name.length} characters` : name, price, name])))(
        "name %j, price %j",
        (_label, price, name) => {
            const server = CreateItemBody.safeParse({ name, price, image: "/images/img.png" });
            const fields: Record<string, string> = {};
            for (const issue of server.error?.issues ?? []) fields[String(issue.path[0])] ??= issue.message;
            expect(checkItem({ name, price })).toEqual(fields);
            // CL-07: the form sends what it accepts as cents, and the server takes those too
            if (!Object.keys(fields).length)
                expect(CreateItemBody.safeParse({ name, priceCents: toCents(Number(price)), image: "/images/img.png" }).success).toBe(true);
        },
    );
});

describe("the server's answer is shown next to the field (VM-17)", () => {
    const DISH = {
        _id: "665f0000000000000000d001",
        name: "Amok",
        priceCents: 500,
        image: "/images/img.png",
        isEnabled: true,
        categoryId: null,
    };

    it("a 400 naming the price shows under Price, and the popup stays open", async () => {
        answer("get", "/api/menu/demo-bistro/items", [DISH]);
        answer("get", "/api/menu/demo-bistro/categories", []);
        render(
            <ResContext.Provider value="demo-bistro">
                <Menu role="owner" />
            </ResContext.Provider>,
        );
        fireEvent.click(await screen.findByRole("button", { name: "Edit Amok" }));
        const dialog = screen.getByRole("dialog");
        const sent = answer(
            "put",
            `/api/menu/demo-bistro/items/${DISH._id}`,
            { code: "INVALID_INPUT", message: "Please check: priceCents", fields: { priceCents: "At most $1,000,000" } }, // CL-07: the form sends cents
            400,
        );
        type("Price ($)", "6");
        fireEvent.click(within(dialog).getByRole("button", { name: "Save Changes" }));
        await waitFor(() => expect(sent).toHaveLength(1));
        await waitFor(() => expect(field("Price ($)")).toHaveAccessibleDescription("At most $1,000,000"));
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
});
