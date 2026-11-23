import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { test } from "node:test";

// CL-06: one naming style, checked so it stays that way.
const files = (...paths) =>
    execFileSync("git", ["ls-files", "--", ...paths], { encoding: "utf8" })
        .split("\n")
        .filter((f) => /\.(ts|tsx|mjs|js)$/.test(f) && !f.includes("node_modules"));
const grep = (pattern, ...paths) => {
    try {
        return execFileSync("git", ["grep", "-nwE", pattern, "--", ...paths], { encoding: "utf8" })
            .trim()
            .split("\n");
    } catch {
        return []; // git grep exits 1 when nothing matches
    }
};

// Next.js gives these files their names.
const NEXT_FILES = /^(page|layout|loading|error|not-found|global-error|template|default|route)\.tsx$/;
const PASCAL = /^[A-Z][A-Za-z0-9]*\.tsx$/;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)*\.(ts|tsx|mjs|js)$/;
const SOURCE = ["frontend/src", "frontend/test", "backend/packages", "backend/services", "e2e", "scripts", "docs/showcase"];

test("component files are PascalCase.tsx, and a popup is a Popup", () => {
    const bad = files("frontend/src").filter((f) => f.endsWith(".tsx") && !PASCAL.test(basename(f)) && !NEXT_FILES.test(basename(f)));
    assert.deepEqual(bad, []);
    assert.deepEqual(
        files(...SOURCE).filter((f) => /PopUp/.test(f)),
        [],
    );
});

test("every other file is kebab-case: orders.service.ts, use-photo.ts, table-url.ts", () => {
    const bad = files(...SOURCE).filter((f) => !(f.startsWith("frontend/src/") && f.endsWith(".tsx")) && !KEBAB.test(basename(f)));
    assert.deepEqual(bad, []);
});

test("a bill is paid (isPaid); the old isPayed is only read for the switch-over", () => {
    const allowed = [
        "backend/packages/contracts/src/orders.ts", // accepts the old name in a request, and answers with both, for one release
        "backend/services/order/src/migrations/is-paid.ts", // renames the stored field
        "backend/services/order/src/routes/bills.routes.ts", // adds the old name to answers, for one release
        "backend/services/order/src/index.ts", // logs the migration
        "scripts/naming.test.mjs", // this test
    ];
    const left = grep(
        "isPayed",
        "frontend/src",
        "backend/services",
        "backend/packages",
        "e2e",
        "scripts",
        "docs/showcase/capture.ts",
    ).filter(
        // tests keep the old name on purpose: they check it still works during the switch-over
        (line) => !allowed.some((f) => line.startsWith(`${f}:`)) && !/^backend\/[^:]*\/test\//.test(line),
    );
    assert.deepEqual(left, []);
});

test("a person's role at a restaurant is a Membership, not a Tenant", () => {
    assert.equal(existsSync("backend/services/restaurant/src/models/tenant.model.ts"), false);
    assert.equal(existsSync("backend/services/restaurant/src/models/membership.model.ts"), true);
    assert.equal(existsSync("backend/services/restaurant/src/repositories/memberships.repo.ts"), true);
    assert.deepEqual(
        grep("Tenant|TenantsRepo|mongoTenantsRepo|tenants", "backend/services/restaurant/src", "backend/services/restaurant/test").filter(
            (l) => !l.includes('"tenants"'),
        ),
        [],
    );
});

test("the README explains the naming", () => {
    const readme = readFileSync("README.md", "utf8");
    assert.match(readme, /^## Naming$/m);
    for (const word of ["PascalCase", "kebab-case", "Popup", "isPaid", "Membership"])
        assert.ok(readme.includes(word), `README naming section mentions ${word}`);
});
