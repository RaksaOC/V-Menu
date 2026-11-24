import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// VM-34: the kitchen screen in Deep Lab: dark by default with a switch, mono column labels with
// counts, cards on --card with the table in large mono, quantities in bold mono, notes in coral,
// a fixed age chip in soft tones, and one full-width button per card (coral for Mark ready).
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("next/navigation", () => ({
    useParams: () => ({ res: "demo-bistro" }),
    useRouter: () => ({ push: vi.fn() }),
    usePathname: () => "/demo-bistro/kitchen",
}));
const { default: Card } = await import("@/features/kitchen/components/OrderCard");
const { default: KitchenColumns } = await import("@/features/kitchen/components/KitchenColumns");
const { default: KitchenHeader } = await import("@/features/kitchen/components/KitchenHeader");
const { AGE_CHIP_CLASS } = await import("@/features/kitchen/kitchen-screen");
const { applyTheme, themeScript } = await import("@/theme/ThemeSync");

const MIN = 60_000;
const dish = { _id: "665f00000000000000000aaa", name: "Kuy Teav", priceCents: 250, image: "/k.jpg", isEnabled: true };
const order = (status: "pending" | "preparing" | "ready", extra: Record<string, unknown> = {}) => ({
    _id: "665f000000000000000a1b2c",
    table: "T4",
    status,
    statusHistory: [],
    createdAt: new Date(Date.now() - 3 * MIN).toISOString(),
    orderedItems: [{ item: dish, quantity: 2, note: "no chilli" }],
    ...extra,
});

beforeEach(() => localStorage.clear());

describe("dark by default, with a switch", () => {
    const paint = (path: string) => {
        window.history.pushState({}, "", path);
        new Function(themeScript)();
        return document.documentElement.dataset.theme;
    };

    it.each(["/demo-bistro/kitchen", "/demo-bistro/kitchen/history"])("%s is dark until the kitchen picks light", (path) => {
        expect(paint(path)).toBe("dark");
        applyTheme(path);
        expect(document.documentElement.dataset.theme).toBe("dark");
        localStorage.setItem("vm-kitchen-theme", "light");
        expect(paint(path)).toBe("light");
        applyTheme(path);
        expect(document.documentElement.dataset.theme).toBe("light");
    });

    it("the kitchen's choice doesn't change the other pages", () => {
        localStorage.setItem("vm-kitchen-theme", "dark");
        expect(paint("/")).toBe("light");
        expect(paint("/demo-bistro/cashier/dashboard")).toBe("light");
    });

    it("the header has the switch", () => {
        render(<KitchenHeader slug="demo-bistro" totalOrders={3} controls={null} />);
        expect(screen.getByRole("button", { name: /switch to (light|dark) theme/i })).toBeInTheDocument();
    });
});

describe("columns", () => {
    it("NEW, PREPARING and READY each have a mono label and a count, even with no orders", () => {
        render(<KitchenColumns orders={[]} fresh={[]} kiosk={false} now={Date.now()} onAdvance={vi.fn()} />);
        for (const name of ["New", "Preparing", "Ready"]) {
            const column = screen.getByRole("region", { name });
            const label = within(column).getByRole("heading", { level: 2 });
            expect(label.className).toContain("font-[family-name:var(--f-mono)]");
            expect(label.className).toContain("uppercase");
            expect(within(column).getByText("0")).toBeInTheDocument();
        }
    });
});

describe("card", () => {
    it("is a --card panel: the table large in mono, number and time muted mono, quantity bold mono, note in coral", () => {
        const { container } = render(<Card order={order("pending")} onAdvance={vi.fn()} now={Date.now()} />);
        expect(container.querySelector("article")!.className).toContain("bg-[var(--card)]");
        const table = screen.getByRole("heading", { name: "Table T4" });
        expect(table.className).toContain("font-[family-name:var(--f-mono)]");
        expect(screen.getByText("Order #0A1B2C").className).toContain("text-[var(--muted)]");
        expect(screen.getByText("2×").className).toContain("font-[family-name:var(--f-mono)]");
        expect(screen.getByText("no chilli").className).toContain("text-[var(--accent-text)]");
    });

    it("has one full-width button; Mark ready is coral, the others are solid", () => {
        const { unmount } = render(<Card order={order("preparing")} onAdvance={vi.fn()} now={Date.now()} />);
        const ready = screen.getByRole("button", { name: "Mark ready" });
        expect(ready).toHaveAttribute("data-variant", "primary");
        expect(ready.className).toContain("w-full");
        expect(screen.getAllByRole("button")).toHaveLength(1);
        unmount();
        render(<Card order={order("pending")} onAdvance={vi.fn()} now={Date.now()} />);
        expect(screen.getByRole("button", { name: "Start preparing" })).toHaveAttribute("data-variant", "solid");
    });

    it("the age chip uses the soft tones, and nothing pulses", () => {
        expect(AGE_CHIP_CLASS).toEqual({
            fresh: expect.stringContaining("bg-[var(--ok-soft)]"),
            waiting: expect.stringContaining("bg-[var(--accent-soft)]"),
            late: expect.stringContaining("bg-[var(--bad-soft)]"),
        });
    });
});

describe("no effects", () => {
    const root = join(__dirname, "..", "..", "src", "features", "kitchen");
    const files = [
        "components/OrderCard.tsx",
        "components/KitchenColumns.tsx",
        "components/KitchenHeader.tsx",
        "components/KitchenControls.tsx",
        "components/KitchenBoard.tsx",
        "components/KitchenHistory.tsx",
        "components/KitchenSignOut.tsx",
        "kitchen-screen.ts",
    ];

    it("no gradients, blur, hover scale, pulsing, big shadows or fixed colours", () => {
        const found: string[] = [];
        for (const f of files) {
            const src = readFileSync(join(root, f), "utf8");
            for (const bad of [
                /bg-gradient/,
                /backdrop-blur/,
                /hover:scale/,
                /animate-pulse/,
                /shadow-(lg|xl|2xl)/,
                /\b(?:bg|text|border|from|to|via)-(?:emerald|green|teal|gray|slate|zinc|red|orange|blue)-\d/,
            ])
                if (bad.test(src)) found.push(`${f}: ${bad}`);
        }
        expect(found).toEqual([]);
    });
});
