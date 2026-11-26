import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// CL-09: owner and cashier share one component per screen part, with role-specific buttons.
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
vi.mock("next/navigation", () => ({ useParams: () => ({ res: "demo-bistro" }), useRouter: () => ({ push: vi.fn() }) }));

const { default: TableCard } = await import("@/features/restaurant/components/TableCard");
const { default: MenuCard } = await import("@/features/restaurant/components/MenuCard");

const table = { _id: "t1", name: "T1", isEnabled: true, qrToken: "AbCdEfGhIjKlMnOpQrSt_-" };
const dish = { _id: "i1", name: "Fish Amok", priceCents: 550, image: "/images/img.png", isEnabled: true };

describe("one TableCard and one MenuCard, role by props", () => {
    it("gives both Open/Close and the QR code, and only the owner Edit (VM-37)", () => {
        const onToggle = vi.fn();
        const { unmount } = render(<TableCard role="cashier" table={table} onToggle={onToggle} />);
        fireEvent.click(screen.getByRole("button", { name: "Close Table" }));
        expect(onToggle).toHaveBeenCalledWith(table);
        expect(screen.queryByRole("button", { name: "Edit Table" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "View QR Code" })).toBeInTheDocument();
        unmount();

        const onEdit = vi.fn();
        render(<TableCard role="owner" table={{ ...table, isEnabled: false }} onEdit={onEdit} onToggle={onToggle} />);
        expect(screen.getByText("Closed")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Edit Table" }));
        expect(onEdit).toHaveBeenCalledWith({ ...table, isEnabled: false });
        fireEvent.click(screen.getByRole("button", { name: "Open Table" })); // VM-37: the owner opens tables too
        expect(onToggle).toHaveBeenCalledWith({ ...table, isEnabled: false });
    });

    it("gives the cashier an availability switch and the owner an edit button", () => {
        const onToggle = vi.fn();
        const { unmount } = render(<MenuCard role="cashier" item={dish} onToggle={onToggle} />);
        fireEvent.click(screen.getByRole("switch", { name: "Fish Amok available" }));
        expect(onToggle).toHaveBeenCalledWith(dish);
        unmount();

        const onEdit = vi.fn();
        render(<MenuCard role="owner" item={dish} onEdit={onEdit} />);
        fireEvent.click(screen.getByRole("button", { name: "Edit Fish Amok" }));
        expect(onEdit).toHaveBeenCalledWith(dish);
        expect(screen.getByText("$5.50")).toBeInTheDocument();
    });
});

describe("no duplicates left (CL-09)", () => {
    const src = join(__dirname, "..", "..", "src");
    const gone = [
        "features/owner/components/tables",
        "features/owner/components/menu",
        "features/owner/components/overview",
        "features/owner/components/Header.tsx",
        "features/cashier/components/tables",
        "features/cashier/components/menu",
        "features/cashier/components/overview",
        "features/cashier/components/Header.tsx",
        "features/staff/components/AddStaffPopUp.tsx",
        "features/staff/components/EditStaffPopUp.tsx",
        "components/ui/skeletons",
    ];
    const present = [
        "features/restaurant/components/Tables.tsx",
        "features/restaurant/components/TableCard.tsx",
        "features/restaurant/components/TableForm.tsx",
        "features/restaurant/components/Menu.tsx",
        "features/restaurant/components/MenuCard.tsx",
        "features/restaurant/components/ItemForm.tsx",
        "features/restaurant/components/Overview.tsx",
        "features/staff/components/StaffForm.tsx",
        "components/layout/DashboardHeader.tsx",
    ];

    it("the owner and cashier copies are merged", () => {
        expect(gone.filter((p) => existsSync(join(src, p)))).toEqual([]);
        expect(present.filter((p) => !existsSync(join(src, p)))).toEqual([]);
    });

    it("every popup uses the shared Modal instead of its own overlay", () => {
        const files = (dir: string): string[] =>
            readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : [join(dir, n)]));
        const ownOverlay = files(join(src, "features"))
            .concat(files(join(src, "components", "qr")))
            .filter((f) => f.endsWith(".tsx") && readFileSync(f, "utf8").includes("fixed inset-0"))
            .map((f) => f.slice(src.length + 1));
        expect(ownOverlay).toEqual([]);
    });
});
