import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// CL-08: the frontend is organised by feature. Routes under app/ only render a feature
// component; the code lives in features/<area>, shared UI in components/, helpers in lib/.
const src = join(__dirname, "..", "src");

function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const p = join(dir, name);
        return statSync(p).isDirectory() ? files(p) : [p];
    });
}

const pages = files(join(src, "app")).filter((f) => /[\\/]page\.tsx$/.test(f));

describe("frontend layout (CL-08)", () => {
    it("has a folder for each feature", () => {
        for (const area of ["customer", "kitchen", "cashier", "owner", "staff", "auth"]) {
            expect(existsSync(join(src, "features", area)), `features/${area}`).toBe(true);
        }
        expect(existsSync(join(src, "lib", "api.ts"))).toBe(true);
    });

    it("no longer has app/shared or app/[res]/common", () => {
        expect(existsSync(join(src, "app", "shared"))).toBe(false);
        expect(existsSync(join(src, "app", "[res]", "common"))).toBe(false);
    });

    it("keeps route pages thin: no hooks, no API calls, no state", () => {
        const fat = pages.filter((f) => {
            const code = readFileSync(f, "utf8");
            return /\buse(State|Effect|Params|Router|Context)\b|\baxios\b|\bapi\.(get|post|put|patch|delete)\b/.test(code);
        });
        expect(fat.map((f) => f.slice(src.length + 1))).toEqual([]);
    });

    it("keeps every component out of app/ (only page, layout, styles and Next's SEO files there)", () => {
        const stray = files(join(src, "app")).filter(
            (f) => !/[\\/](page|layout|opengraph-image)\.tsx$|[\\/](robots|sitemap)\.ts$|\.(css|ico)$/.test(f),
        );
        expect(stray.map((f) => f.slice(src.length + 1))).toEqual([]);
    });
});
