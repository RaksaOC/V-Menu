import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { answer } from "../api/helpers";

// VM-15: renaming or deleting a table with an unpaid bill is refused; the popup says why.
vi.mock("next/navigation", () => ({ useParams: () => ({}), useRouter: () => ({ push: vi.fn() }) }));
const { ResContext } = await import("@/lib/restaurant-context");
const { default: Tables } = await import("@/features/restaurant/components/Tables");

const TABLES = "/api/menu/demo-bistro/tables";
const T4 = { _id: "665f000000000000000000b4", name: "4", isEnabled: true, qrToken: "AbCdEfGhIjKlMnOpQrSt_-" };
const REFUSED = { code: "TABLE_HAS_OPEN_BILL", message: "Table 4 has an unpaid bill. Mark it paid, then try again." };

async function editTable4() {
    answer("get", TABLES, [T4]);
    answer("get", "/api/restaurants/demo-bistro/public", { name: "Demo Bistro", slug: "demo-bistro" });
    render(
        <ResContext.Provider value="demo-bistro">
            <Tables role="owner" />
        </ResContext.Provider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Edit Table" }));
    return within(screen.getByRole("dialog"));
}

describe("a table with an unpaid bill (VM-15)", () => {
    it("rename: the server's reason is shown under the name", async () => {
        const dialog = await editTable4();
        answer("put", `${TABLES}/${T4._id}`, REFUSED, 409);
        fireEvent.change(dialog.getByRole("textbox", { name: "Table name" }), { target: { value: "Patio" } });
        fireEvent.click(dialog.getByRole("button", { name: "Save Changes" }));
        await waitFor(() => expect(dialog.getByRole("textbox", { name: "Table name" })).toHaveAccessibleDescription(REFUSED.message));
    });

    it("delete: the server's reason is shown in the popup, which stays open", async () => {
        const dialog = await editTable4();
        const sent = answer("delete", `${TABLES}/${T4._id}`, REFUSED, 409);
        fireEvent.click(dialog.getByRole("button", { name: "Delete" }));
        fireEvent.click(dialog.getByRole("button", { name: "Delete" }));
        await waitFor(() => expect(sent).toHaveLength(1));
        expect(await dialog.findByRole("alert")).toHaveTextContent(REFUSED.message);
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
});
