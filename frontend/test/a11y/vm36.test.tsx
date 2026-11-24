import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// VM-36: the accessibility fixes the axe check (B5) asked for: readable coral text, labelled
// fields, dialogs that trap focus and close on Escape, and toasts that are announced politely.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/" }));
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({ createUserWithEmailAndPassword: vi.fn(), sendEmailVerification: vi.fn() }));
const { default: SignupPage } = await import("@/features/auth/components/SignupPage");
const { default: MobileSidebar } = await import("@/components/layout/MobileSidebar");
const { ToastHost, toast } = await import("@/components/ui/Toast");

const src = join(__dirname, "..", "..", "src");
const css = readFileSync(join(src, "theme", "deep-lab.css"), "utf8") + readFileSync(join(src, "app", "globals.css"), "utf8");

/** The first value of a custom property in the light (first) block of the CSS. */
const token = (name: string) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))![1].trim();
const rgb = (c: string): [number, number, number, number] => {
    const hex = c.match(/^#([0-9a-f]{6})$/i);
    if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).concat(1) as [number, number, number, number];
    const [r, g, b, a = 1] = c.match(/[\d.]+/g)!.map(Number);
    return [r, g, b, a];
};
const over = (top: string, under: string) => {
    const [r, g, b, a] = rgb(top);
    const [R, G, B] = rgb(under);
    return [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a)] as const;
};
const lum = ([r, g, b]: readonly number[]) => {
    const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a: readonly number[], b: readonly number[]) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
};

describe("coral text is readable (light)", () => {
    const text = rgb(token("accent-text"));
    it.each(["bg", "card", "surface-2"])("--accent-text on --accent-soft over --%s is at least 4.5:1", (bg) => {
        expect(contrast(text, over(token("accent-soft"), token(bg)))).toBeGreaterThanOrEqual(4.5);
    });
    it("white on the remapped blue-600 (the coral buttons) is at least 4.5:1", () => {
        expect(contrast([255, 255, 255], rgb(token("a-600")))).toBeGreaterThanOrEqual(4.5);
    });
});

describe("coral text goes through --accent-text", () => {
    const walk = (dir: string): string[] =>
        readdirSync(dir).flatMap((f) => {
            const p = join(dir, f);
            return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) ? [p] : [];
        });
    it("no text-blue-* or text-[var(--accent)] classes", () => {
        const found = walk(src).flatMap((f) =>
            (readFileSync(f, "utf8").match(/(?<![\w:-])(?:dark:)?text-(?:blue-\d+(?:\/\d+)?|\[var\(--accent\)\])/g) ?? []).map(
                (m) => `${f.replace(src, "src")}: ${m}`,
            ),
        );
        expect(found).toEqual([]);
    });
});

describe("sign-up form", () => {
    it("every field has a label, and Log in is a real link", () => {
        render(<SignupPage />);
        for (const name of ["Restaurant Name", "Owner Name", "Email", "Password"]) expect(screen.getByLabelText(name)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    });
});

describe("the owner's menu on small screens", () => {
    const open = () => {
        const onClose = vi.fn();
        render(
            <MobileSidebar open onClose={onClose} user={{ name: "Dara", role: "owner" }}>
                <a href="/owner">Overview</a>
            </MobileSidebar>,
        );
        return onClose;
    };

    it("is a dialog labelled by its heading", () => {
        open();
        const dialog = screen.getByRole("dialog", { name: "Menu" });
        expect(dialog).toHaveAttribute("aria-modal", "true");
    });

    it("closes on Escape", () => {
        const onClose = open();
        fireEvent.keyDown(document, { key: "Escape" });
        expect(onClose).toHaveBeenCalled();
    });

    it("keeps Tab inside", () => {
        open();
        const close = screen.getByRole("button", { name: "Close the menu" });
        const last = screen.getByRole("link", { name: "Overview" });
        expect(close).toHaveFocus();
        last.focus();
        fireEvent.keyDown(document, { key: "Tab" });
        expect(close).toHaveFocus();
    });
});

describe("toasts", () => {
    it("success is a polite status, an error is an alert", async () => {
        render(<ToastHost />);
        await act(async () => {
            toast.success("Saved");
            toast.error("Could not save");
        });
        expect(await screen.findByRole("status")).toHaveTextContent("Saved");
        expect(await screen.findByRole("alert")).toHaveTextContent("Could not save");
    });
});
