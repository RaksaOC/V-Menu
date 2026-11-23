import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

const base = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: base }));

const { toast } = await import("@/lib/toast");

describe("toast helper (CL-10)", () => {
    it("shows each kind with the one shared Deep Lab style", () => {
        toast.success("Added to cart");
        toast.info("Item removed");
        toast.error("Could not place the order");
        expect(base.success).toHaveBeenCalledWith("Added to cart", expect.objectContaining({ className: "vm-toast" }));
        expect(base.info).toHaveBeenCalledWith("Item removed", expect.objectContaining({ className: "vm-toast" }));
        expect(base.error).toHaveBeenCalledWith("Could not place the order", expect.objectContaining({ className: "vm-toast" }));
    });

    it("keeps errors on screen longer than other messages", () => {
        toast.success("ok");
        toast.error("no");
        const ok = base.success.mock.calls.at(-1)![1];
        const bad = base.error.mock.calls.at(-1)![1];
        expect(bad.autoClose).toBeGreaterThan(ok.autoClose);
    });
});

describe("one way to call the API and to show a toast (CL-10)", () => {
    const src = join(__dirname, "..", "..", "src");
    const files = (dir: string): string[] =>
        readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : [join(dir, n)]));
    const code = files(src)
        .filter((f) => /\.tsx?$/.test(f))
        // Forward slashes on every OS, so the path checks below also work on Windows.
        .map((f) => ({ f: f.slice(src.length + 1).replace(/\\/g, "/"), text: readFileSync(f, "utf8") }));

    it("only lib/api.ts imports axios", () => {
        const users = code.filter(({ text }) => /from ["']axios["']/.test(text)).map(({ f }) => f);
        expect(users).toEqual(["lib/api.ts"]);
    });

    it("components call typed functions, never the API client directly", () => {
        const direct = code
            .filter(({ f, text }) => f.includes("/components/") && /\bapi\.(get|post|put|patch|delete)\b/.test(text))
            .map(({ f }) => f);
        expect(direct).toEqual([]);
    });

    it("no file copies toast options any more", () => {
        const copies = code.filter(({ f, text }) => f !== "lib/toast.ts" && /toast\.\w+\([^)]*,\s*\{/.test(text)).map(({ f }) => f);
        expect(copies).toEqual([]);
    });
});
