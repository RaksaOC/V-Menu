// CL-14: the services' tests share their setup through @vmenu/common/testing, and stay small.
// Run with `npm run test:repo` (CI: the `test (repo)` job).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = join(import.meta.dirname, "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const files = (...paths) =>
    execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", ...paths], { cwd: root, encoding: "utf8" })
        .split("\n")
        .filter((f) => f.endsWith(".ts") && !f.includes("node_modules"));

const SERVICE_TESTS = files("backend/services").filter((f) => f.includes("/test/"));
const ALL_TESTS = files("backend/services", "backend/packages").filter((f) => f.includes("/test/"));
const TESTING = "backend/packages/common/src/testing.ts";

/** A test file longer than this is split by route group or by topic. */
const MAX_TEST_LINES = 300;

const matching = (list, re) => list.filter((f) => re.test(read(f)));

test("@vmenu/common/testing has the shared helpers", () => {
    const src = read(TESTING);
    for (const name of ["startMemoryMongo", "tokenFor", "fakeRestaurantLookup"])
        assert.match(src, new RegExp(`export (async )?function ${name}\\b`), name);
});

test("no service test starts its own in-memory MongoDB", () => {
    assert.deepEqual(matching(SERVICE_TESTS, /from "mongodb-memory-server"/), []);
});

test("no service test writes its own restaurant lookup", () => {
    assert.deepEqual(matching(SERVICE_TESTS, /lookupRestaurant\s*[:=]\s*async/), []);
});

test("no service test builds its own Bearer header", () => {
    assert.deepEqual(matching(SERVICE_TESTS, /Bearer \$\{await signAppToken/), []);
});

test(`every backend test file has at most ${MAX_TEST_LINES} lines`, () => {
    const big = ALL_TESTS.map((f) => [f, read(f).split("\n").length - 1]).filter(([, n]) => n > MAX_TEST_LINES);
    assert.deepEqual(
        big.map(([f, n]) => `${f}: ${n} lines`),
        [],
    );
});

test("order tests build their data with builders: anOrder(), aBill().paid()", () => {
    const order = SERVICE_TESTS.filter((f) => f.startsWith("backend/services/order/"));
    const builders = order.filter((f) => /export function anOrder\(/.test(read(f)));
    assert.equal(builders.length, 1, "one anOrder() builder in the order tests");
    const users = matching(
        order.filter((f) => f.endsWith(".test.ts")),
        /anOrder\(\)/,
    );
    assert.ok(users.length >= 2, `used by the tests (now: ${users.join(", ") || "none"})`);
});
