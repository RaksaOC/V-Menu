import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { answer } from "../api/helpers";

// VM-37: new tables start closed, and a closed table takes no orders. The owner can open and close a
// table on their own Tables screen; before, only the cashier screen had the button.
vi.mock("next/navigation", () => ({ useParams: () => ({}), useRouter: () => ({ push: vi.fn() }) }));
const { ResContext } = await import("@/lib/restaurant-context");
const { default: Tables } = await import("@/features/restaurant/components/Tables");

const TABLES = "/api/menu/demo-bistro/tables";
const PATIO = { _id: "665f000000000000000000a1", name: "patio", isEnabled: false, qrToken: "AbCdEfGhIjKlMnOpQrSt_-" };

function owner(table = PATIO) {
    answer("get", TABLES, [table]);
    render(
        <ResContext.Provider value="demo-bistro">
            <Tables role="owner" />
        </ResContext.Provider>,
    );
}

describe("the owner opens and closes tables (VM-37)", () => {
    it("a closed table has an Open Table button, which opens it", async () => {
        owner();
        const sent = answer("patch", `${TABLES}/${PATIO._id}/availability`, { ...PATIO, isEnabled: true });
        fireEvent.click(await screen.findByRole("button", { name: "Open Table" }));
        await waitFor(() => expect(sent[0]?.body).toEqual({ isEnabled: true }));
        expect(await screen.findByRole("button", { name: "Close Table" })).toBeInTheDocument();
        expect(screen.getByText("Open")).toBeInTheDocument();
    });

    it("an open table can be closed", async () => {
        owner({ ...PATIO, isEnabled: true });
        const sent = answer("patch", `${TABLES}/${PATIO._id}/availability`, { ...PATIO, isEnabled: false });
        fireEvent.click(await screen.findByRole("button", { name: "Close Table" }));
        await waitFor(() => expect(sent[0]?.body).toEqual({ isEnabled: false }));
    });

    it("the owner keeps Edit Table and the QR code", async () => {
        owner();
        expect(await screen.findByRole("button", { name: "Edit Table" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "View QR Code" })).toBeInTheDocument();
    });
});
