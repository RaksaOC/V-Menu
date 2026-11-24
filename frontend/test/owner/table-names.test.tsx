import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { answer } from "../api/helpers";

// VM-16: a table name that's taken is refused by the server (409). The Add Table popup stays open
// and says so next to the name, instead of a toast that doesn't say why.
vi.mock("next/navigation", () => ({ useParams: () => ({}), useRouter: () => ({ push: vi.fn() }) }));
const { ResContext } = await import("@/lib/restaurant-context");
const { default: Tables } = await import("@/features/restaurant/components/Tables");

const TABLES = "/api/menu/demo-bistro/tables";
const PATIO = { _id: "665f000000000000000000a1", name: "patio", isEnabled: false, qrToken: "AbCdEfGhIjKlMnOpQrSt_-" };

function owner() {
    answer("get", TABLES, [PATIO]);
    render(
        <ResContext.Provider value="demo-bistro">
            <Tables role="owner" />
        </ResContext.Provider>,
    );
}

describe("adding a table whose name is taken (VM-16)", () => {
    it("shows 'Table name is taken.' next to the name and keeps the popup open", async () => {
        owner();
        fireEvent.click(await screen.findByRole("button", { name: "Add Table" }));
        const dialog = screen.getByRole("dialog");
        fireEvent.click(within(dialog).getByRole("radio", { name: "Choose a name" }));
        fireEvent.change(within(dialog).getByRole("textbox", { name: "Table name" }), { target: { value: "patio" } });
        const sent = answer("post", TABLES, { code: "NAME_TAKEN", message: "Name is taken", fields: { name: "Name is taken" } }, 409);
        fireEvent.click(within(dialog).getByRole("button", { name: "Add Table" }));
        await waitFor(() => expect(sent[0]?.body).toEqual({ name: "patio", type: "manual" }));
        await waitFor(() =>
            expect(within(dialog).getByRole("textbox", { name: "Table name" })).toHaveAccessibleDescription("Table name is taken."),
        );
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("renaming to a taken name says so too", async () => {
        owner();
        fireEvent.click(await screen.findByRole("button", { name: "Edit Table" }));
        const dialog = screen.getByRole("dialog");
        fireEvent.change(within(dialog).getByRole("textbox", { name: "Table name" }), { target: { value: "window" } });
        answer("put", `${TABLES}/${PATIO._id}`, { code: "NAME_TAKEN", message: "Name is taken", fields: { name: "Name is taken" } }, 409);
        fireEvent.click(within(dialog).getByRole("button", { name: "Save Changes" }));
        await waitFor(() =>
            expect(within(dialog).getByRole("textbox", { name: "Table name" })).toHaveAccessibleDescription("Table name is taken."),
        );
    });

    it("an automatic table that can't be added says so in the popup", async () => {
        owner();
        fireEvent.click(await screen.findByRole("button", { name: "Add Table" }));
        const dialog = screen.getByRole("dialog");
        answer("post", TABLES, { message: "Something went wrong" }, 500);
        fireEvent.click(within(dialog).getByRole("button", { name: "Add Table" }));
        expect(await within(dialog).findByRole("alert")).toHaveTextContent("Could not save the table. Please try again.");
    });
});
