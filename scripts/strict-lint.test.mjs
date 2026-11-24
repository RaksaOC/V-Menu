// CL-13: stricter lint and type checks, for the backend and the frontend, and CI runs them.
// Run with `npm run test:repo` (CI: the `test (repo)` job).
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = join(import.meta.dirname, "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const json = (p) => JSON.parse(read(p));

const BACKEND_PACKAGES = [
    "backend/packages/common",
    "backend/packages/contracts",
    "backend/services/restaurant",
    "backend/services/menu",
    "backend/services/order",
];

/** The level a flat config gives a rule: "error" in `"rule": "error"` or `"rule": ["error", {...}]`. */
function level(config, rule) {
    const m = config.match(new RegExp(`["']${rule.replace(/[/]/g, "\\/")}["']\\s*:\\s*\\[?\\s*["'](\\w+)["']`));
    return m?.[1];
}

const RULES = ["@typescript-eslint/no-explicit-any", "@typescript-eslint/no-unused-vars", "no-console", "import/order"];

test("the backend has its own lint config and script", () => {
    assert.ok(existsSync(join(root, "backend/eslint.config.mjs")), "backend/eslint.config.mjs");
    assert.match(json("backend/package.json").scripts?.lint ?? "", /eslint/);
});

test("the root `lint` runs the backend and the frontend", () => {
    const lint = json("package.json").scripts.lint;
    assert.match(lint, /backend/);
    assert.match(lint, /frontend/);
});

for (const [name, file, extra] of [
    ["backend", "backend/eslint.config.mjs", []],
    ["frontend", "frontend/eslint.config.mjs", ["react-hooks/exhaustive-deps"]],
]) {
    test(`${name} lint: the strict rules are errors, so CI blocks new ones`, () => {
        const config = read(file);
        const notErrors = [...RULES, ...extra].filter((r) => level(config, r) !== "error");
        assert.deepEqual(notErrors, []);
        // no-console still allows warn and error
        assert.match(config, /["']no-console["']\s*:\s*\[\s*["']error["']\s*,\s*\{\s*allow:\s*\[\s*["']warn["']\s*,\s*["']error["']\s*\]/);
    });
}

test("TypeScript is strict everywhere, and the backend checks indexed access", () => {
    for (const dir of [...BACKEND_PACKAGES, "frontend", "e2e"]) {
        const opts = json(`${dir}/tsconfig.json`).compilerOptions;
        assert.equal(opts.strict, true, `${dir}: strict`);
    }
    for (const dir of BACKEND_PACKAGES)
        assert.equal(json(`${dir}/tsconfig.json`).compilerOptions.noUncheckedIndexedAccess, true, `${dir}: noUncheckedIndexedAccess`);
});

test("CI lints the backend inside the required `test` gate", () => {
    const ci = read(".github/workflows/ci.yml");
    assert.match(ci, /\{\s*name:\s*backend-lint,\s*dir:\s*backend,\s*kind:\s*lint/);
    assert.match(ci, /name: Lint\n\s+if: matrix\.kind == 'web' \|\| matrix\.kind == 'lint'/);
});

test("the e2e specs are type-checked too", () => {
    assert.match(json("package.json").scripts.typecheck, /e2e/);
    assert.match(json("e2e/package.json").scripts?.typecheck ?? "", /tsc/);
});
