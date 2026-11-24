// VM-36: no known accessibility issues are left, the customer menu scores at least 90 for
// accessibility in Lighthouse, and the customer can order with the keyboard alone.
// Run with `npm run test:repo` (CI: the `test (repo)` job).
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = join(import.meta.dirname, "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const exists = (p) => existsSync(join(root, p));

test("the list of known axe issues is empty", () => {
    const known = read("e2e/tests/support/a11y-known.ts");
    const body = known.slice(known.indexOf("KNOWN"));
    assert.match(body, /KNOWN: Record<string, string\[\]> = \{\s*\};/, "every issue in a11y-known.ts is fixed");
});

test("lighthouse is a dev dependency of the e2e specs, pinned to an exact version", () => {
    const dev = JSON.parse(read("e2e/package.json")).devDependencies ?? {};
    assert.match(dev.lighthouse ?? "", /^\d+\.\d+\.\d+$/);
});

test("a Lighthouse check of the customer menu needs an accessibility score of at least 90", () => {
    const pkg = JSON.parse(read("e2e/package.json"));
    assert.match(pkg.scripts?.lighthouse ?? "", /lighthouse\.mjs/, "npm --prefix e2e run lighthouse");
    assert.ok(exists("e2e/scripts/lighthouse.mjs"), "e2e/scripts/lighthouse.mjs");
    const script = read("e2e/scripts/lighthouse.mjs");
    assert.match(script, /customer\//, "it checks the customer menu");
    assert.match(script, /accessibility/);
    assert.match(script, /\b(0\.9|90)\b/, "the minimum is 90");
    const ci = read(".github/workflows/ci.yml");
    assert.match(ci, /run lighthouse/, "CI runs it in the e2e job");
});

test("a keyboard-only journey: menu to placed order without a mouse", () => {
    assert.ok(exists("e2e/tests/keyboard.spec.ts"), "e2e/tests/keyboard.spec.ts");
    const spec = read("e2e/tests/keyboard.spec.ts");
    assert.match(spec, /keyboard\.press\("Tab"\)/);
    assert.doesNotMatch(spec, /\.click\(/, "no clicks");
});
