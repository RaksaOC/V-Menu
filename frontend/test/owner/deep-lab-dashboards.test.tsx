import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { Users } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

// VM-35: the cashier and owner dashboards in Deep Lab: solid buttons, no effects, mono status
// chips on the table cards, View QR outlined, large mono figures with mono labels, and dark mode.
vi.mock("next/navigation", () => ({ useParams: () => ({ res: "demo-bistro" }), useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/firebase", () => ({ auth: {} }));
const { default: TableCard } = await import("@/features/restaurant/components/TableCard");
const { StatCard } = await import("@/features/owner/components/all-overview/StatCard");
const { DARK_READY } = await import("@/theme/ThemeSync");

const table = (isEnabled: boolean) => ({ _id: "665f00000000000000000t01", name: "T4", isEnabled, qrToken: "tok", resId: "r" });

describe("table cards", () => {
    it("an open table has a mono OPEN chip in --ok-soft; View QR is outlined", () => {
        render(<TableCard table={table(true)} role="cashier" onToggle={vi.fn()} />);
        const chip = screen.getByText("Open");
        expect(chip.className).toContain("font-[family-name:var(--f-mono)]");
        expect(chip.className).toContain("uppercase");
        expect(chip.className).toContain("bg-[var(--ok-soft)]");
        expect(screen.getByRole("button", { name: "View QR Code" })).toHaveAttribute("data-variant", "outline");
    });

    it("a closed table has a CLOSED chip in --surface-2", () => {
        render(<TableCard table={table(false)} role="cashier" onToggle={vi.fn()} />);
        expect(screen.getByText("Closed").className).toContain("bg-[var(--surface-2)]");
    });
});

describe("overview figures", () => {
    it("are large mono figures under a mono uppercase label", () => {
        render(<StatCard title="Orders today" value={1234} icon={Users} />);
        expect(screen.getByText("1,234").className).toContain("font-[family-name:var(--f-mono)]");
        const label = screen.getByText("Orders today");
        expect(label.className).toContain("font-[family-name:var(--f-mono)]");
        expect(label.className).toContain("uppercase");
    });
});

describe("dark mode", () => {
    const darkReady = (p: string) => new Function("p", `return ${DARK_READY}`)(p) as boolean;

    it("the cashier dashboard and the owner pages have dark styles", () => {
        expect(darkReady("/demo-bistro/cashier/dashboard")).toBe(true);
        expect(darkReady("/owner")).toBe(true);
    });
});

describe("no effects", () => {
    const src = join(__dirname, "..", "..", "src");
    const walk = (dir: string): string[] =>
        readdirSync(dir).flatMap((f) => {
            const p = join(dir, f);
            return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) ? [p] : [];
        });
    const files = ["features/cashier", "features/owner", "features/restaurant", "features/staff"].flatMap((d) => walk(join(src, d)));

    it("no gradients, blur, hover scale, pulsing, big shadows or fixed palette colours", () => {
        const found: string[] = [];
        for (const f of files) {
            const text = readFileSync(f, "utf8");
            for (const bad of [
                /bg-gradient/,
                /backdrop-blur/,
                /hover:scale/,
                /hover:-translate/,
                /animate-pulse/,
                /shadow-(md|lg|xl|2xl)/,
                /\b(?:bg|text|border|from|to|via|ring|divide)-(?:emerald|green|teal|gray|slate|zinc|red|blue|indigo|purple|orange|yellow|amber|pink|sky|cyan|rose|violet)-\d/,
            ])
                if (bad.test(text)) found.push(`${f.replace(src, "src")}: ${bad}`);
        }
        expect(found).toEqual([]);
    });
});
