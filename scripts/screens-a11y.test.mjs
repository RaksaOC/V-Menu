// B5: screenshot tests of the main screens, and an axe check of every page.
// Run with `npm run test:repo` (CI: the `test (repo)` job).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = join(import.meta.dirname, "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const exists = (p) => existsSync(join(root, p));
const files = (...paths) =>
    execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", ...paths], { cwd: root, encoding: "utf8" })
        .split("\n")
        .filter(Boolean);

const EXACT = /^\d+\.\d+\.\d+$/;

test("@axe-core/playwright is a dev dependency of the e2e specs, pinned to an exact version", () => {
    const dev = JSON.parse(read("e2e/package.json")).devDependencies ?? {};
    assert.match(dev["@axe-core/playwright"] ?? "", EXACT);
    assert.match(dev["axe-core"] ?? "", EXACT, "axe-core pinned too, so the rules don't change under us");
});

/** The app's pages, as route patterns: frontend/src/app/[res]/kitchen/page.tsx is /[res]/kitchen. */
const ROUTES = files("frontend/src/app")
    .filter((f) => f.endsWith("/page.tsx"))
    .map((f) => f.replace("frontend/src/app", "").replace(/\/page\.tsx$/, "") || "/");

test("the axe check visits every page of the app", () => {
    assert.ok(exists("e2e/tests/a11y.spec.ts"), "e2e/tests/a11y.spec.ts");
    assert.ok(exists("e2e/tests/support/pages.ts"), "e2e/tests/support/pages.ts lists the pages");
    const pages = read("e2e/tests/support/pages.ts");
    const missing = ROUTES.filter((route) => !pages.includes(`route: "${route}"`));
    assert.deepEqual(missing, []);
});

test("the axe check fails on serious and critical issues", () => {
    const spec = read("e2e/tests/a11y.spec.ts");
    assert.match(spec, /AxeBuilder/);
    assert.match(spec, /serious/);
    assert.match(spec, /critical/);
});

/** The main screens (VM-33 to VM-35), each in light and dark. */
const SCREENS = [
    "customer-menu",
    "cart",
    "kitchen",
    "cashier-overview",
    "cashier-tables",
    "cashier-orders",
    "cashier-menu",
    "owner-overview",
];

test("screenshot tests of the main screens, light and dark, with their reference images in the repo", () => {
    assert.ok(exists("e2e/tests/screens.spec.ts"), "e2e/tests/screens.spec.ts");
    assert.match(read("e2e/tests/screens.spec.ts"), /toHaveScreenshot\(/);
    const shots = files("e2e/screens");
    const missing = SCREENS.flatMap((s) => ["light", "dark"].map((t) => `${s}-${t}`)).filter(
        (name) => !shots.some((f) => f.endsWith(`/${name}.png`) || f.endsWith(`/${name}-desktop.png`)),
    );
    assert.deepEqual(missing, []);
});
