import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// VM-01 follow-up: the owner's QR cards carry the restaurant's name (the spec asks for it), and the
// QR controls follow the Deep Lab rules: 44 px targets, coral only for the one main action.
const qr = vi.hoisted(() => ({ toDataURL: vi.fn(async (text: string) => `data:image/png;base64,${btoa(text)}`) }));
vi.mock("qrcode", () => ({ default: qr, ...qr }));
const printing = vi.hoisted(() => ({ printQrCards: vi.fn(async () => {}) }));
vi.mock("@/components/qr/print", async (orig) => ({ ...(await orig<object>()), printQrCards: printing.printQrCards }));
vi.mock("@/lib/firebase", () => ({ auth: {} }));

const { tableUrl } = await import("@/lib/tableUrl");
const { ResContext, ResNameContext } = await import("@/features/owner/ResContext");
const { default: TableCard } = await import("@/features/restaurant/components/TableCard");
const { default: Tables } = await import("@/features/restaurant/components/Tables");
const { default: TableQrModal } = await import("@/components/qr/TableQrModal");
const { answer } = await import("../api/helpers");

const classes = (el: Element) => (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
const table = { _id: "t1", name: "T1", isEnabled: true };

function asOwner(children: React.ReactNode) {
    return (
        <ResContext.Provider value="demo-bistro">
            <ResNameContext.Provider value="Demo Bistro">{children}</ResNameContext.Provider>
        </ResContext.Provider>
    );
}

describe("the restaurant's name on the owner's QR cards", () => {
    it("shows it in the QR modal", async () => {
        render(asOwner(<TableCard role="owner" table={table} onEdit={() => {}} />));
        fireEvent.click(screen.getByRole("button", { name: /view qr code/i }));
        const dialog = await screen.findByRole("dialog", { name: /T1/ });
        expect(dialog).toHaveTextContent("Demo Bistro");
    });

    it("prints it on this table's card", async () => {
        render(asOwner(<TableCard role="owner" table={table} onEdit={() => {}} />));
        fireEvent.click(screen.getByRole("button", { name: /view qr code/i }));
        fireEvent.click(await screen.findByRole("button", { name: /^print$/i }));
        expect(printing.printQrCards).toHaveBeenLastCalledWith([{ restaurantName: "Demo Bistro", tableName: "T1", url: tableUrl("demo-bistro", "T1") }]);
    });

    it("prints it on every card of Print all QR codes", async () => {
        answer("get", "/api/menu/demo-bistro/tables", [table, { _id: "t2", name: "Patio 2", isEnabled: false }]);
        render(asOwner(<Tables role="owner" />));
        fireEvent.click(await screen.findByRole("button", { name: /print all qr codes/i }));
        expect(printing.printQrCards).toHaveBeenLastCalledWith([
            { restaurantName: "Demo Bistro", tableName: "T1", url: tableUrl("demo-bistro", "T1") },
            { restaurantName: "Demo Bistro", tableName: "Patio 2", url: tableUrl("demo-bistro", "Patio 2") },
        ]);
    });
});

describe("QR controls follow the Deep Lab rules", () => {
    it("Download PNG is a 44 px target", async () => {
        render(<TableQrModal slug="demo-bistro" tableName="T1" onClose={() => {}} />);
        const link = await screen.findByRole("link", { name: /download png/i });
        expect(classes(link)).toContain("min-h-11");
        expect(classes(link)).toContain("min-w-11");
    });

    it("View QR Code is not a coral button, so each screen keeps one main action", () => {
        render(
            <>
                <TableCard role="owner" table={table} onEdit={() => {}} />
                <TableCard role="cashier" table={{ ...table, _id: "t2", name: "T2" }} onToggle={() => {}} />
            </>,
        );
        for (const button of screen.getAllByRole("button", { name: /view qr code/i })) {
            expect(button.getAttribute("data-variant")).not.toBe("primary");
        }
    });
});
