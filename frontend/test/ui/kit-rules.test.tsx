import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// CL-09: the UI kit follows the Deep Lab rules of section 3 (touch targets, motion, labels, tokens).
// jsdom doesn't lay out Tailwind classes, so these tests check the classes that carry each rule.
vi.mock("react-toastify", () => ({ ToastContainer: () => null, toast: {} }));

const { Button, Chip, Input, Modal, Skeleton } = await import("@/components/ui");

const classes = (el: Element) => (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);

describe("touch targets are at least 44 x 44 px", () => {
    it("every Button size has a 44 px minimum height and width", () => {
        render(
            <>
                <Button>Medium</Button>
                <Button size="sm">Small</Button>
            </>,
        );
        for (const name of ["Medium", "Small"]) {
            const c = classes(screen.getByRole("button", { name }));
            expect(c, name).toContain("min-h-11");
            expect(c, name).toContain("min-w-11");
        }
    });

    it("the Input field and the Modal close button are 44 px tall", () => {
        render(
            <Modal title="Edit" onClose={() => {}}>
                <Input label="Name" />
            </Modal>,
        );
        expect(classes(screen.getByLabelText("Name"))).toContain("min-h-11");
        const close = classes(screen.getByRole("button", { name: "Close" }));
        expect(close).toContain("min-h-11");
        expect(close).toContain("min-w-11");
    });
});

describe("motion", () => {
    it("the Skeleton doesn't pulse", () => {
        render(<Skeleton variant="table" />);
        const status = screen.getByRole("status", { name: "Loading" });
        const all = [status, ...status.querySelectorAll("*")].flatMap(classes);
        expect(all.filter((c) => c.includes("animate-pulse"))).toEqual([]);
    });

    it("animations and transitions in the kit only run when the user allows motion", () => {
        const dir = join(__dirname, "..", "..", "src", "components", "ui");
        const unguarded = readdirSync(dir)
            .filter((f) => f.endsWith(".tsx"))
            .flatMap((f) =>
                (readFileSync(join(dir, f), "utf8").match(/[\w:-]*(?:animate-[\w-]+|\btransition(?:-[\w]+)?)\b/g) ?? [])
                    .filter((c) => !c.startsWith("motion-safe:") && !c.startsWith("motion-reduce:"))
                    .map((c) => `${f}: ${c}`),
            );
        expect(unguarded).toEqual([]);
    });
});

describe("labels and colours", () => {
    it("a Chip uses the mono label style: label font, uppercase, label tracking", () => {
        render(<Chip tone="ok">Open</Chip>);
        const c = classes(screen.getByText("Open"));
        expect(c).toContain("font-[family-name:var(--f-label)]");
        expect(c).toContain("uppercase");
        expect(c).toContain("tracking-[var(--label-track)]");
    });

    it("the danger Button uses theme tokens only, so it reads in light and dark", () => {
        render(<Button variant="danger">Delete</Button>);
        const c = classes(screen.getByRole("button", { name: "Delete" }));
        expect(c.filter((x) => /white|black|#[0-9a-f]{3,8}/i.test(x))).toEqual([]);
        expect(c.some((x) => x.includes("var(--bad"))).toBe(true);
    });
});
