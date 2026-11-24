// CL-11: small files and no dead code, checked so it stays that way.
// Run with `npm run test:repo` (CI: the `test (repo)` job).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = join(import.meta.dirname, "..");
const files = (...paths) =>
    execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", ...paths], { cwd: root, encoding: "utf8" })
        .split("\n")
        .filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes("node_modules") && !f.endsWith(".d.ts"));
const lines = (f) => readFileSync(join(root, f), "utf8").split("\n");

const FRONTEND = files("frontend/src");
const BACKEND_SRC = files("backend/services", "backend/packages").filter((f) => f.includes("/src/"));

/** Files over this many lines are split into smaller components, one job each. */
const MAX_LINES = 200;

test(`every frontend source file has at most ${MAX_LINES} lines`, () => {
    const big = FRONTEND.map((f) => ({ f, n: lines(f).length - 1 }))
        .filter(({ n }) => n > MAX_LINES)
        .map(({ f, n }) => `${f}: ${n} lines`);
    assert.deepEqual(big, []);
});

// Code that was commented out instead of deleted: a JSX comment that starts with a tag, or a line
// comment that holds a statement. Git keeps the history, so dead code is deleted.
const DEAD_JSX = /\{\/\*\s*<\/?[A-Za-z]/;
const DEAD_LINE =
    /^\s*\/\/\s*((const|let|var) \w+ =|import .*from |export (const|function|default) |return .*;$|await \w|function \w+\(|if \(.*\) ?\{|\}[\s);,\]]*$|set[A-Z]\w*\(|console\.)/;

test("no commented-out code", () => {
    const dead = [];
    for (const f of [...FRONTEND, ...BACKEND_SRC]) {
        lines(f).forEach((l, i) => {
            if (DEAD_JSX.test(l) || DEAD_LINE.test(l)) dead.push(`${f}:${i + 1}: ${l.trim()}`);
        });
    }
    assert.deepEqual(dead, []);
});

test("no console.log left in app code (warn and error are fine)", () => {
    const logs = [];
    for (const f of [...FRONTEND, ...BACKEND_SRC]) {
        lines(f).forEach((l, i) => {
            if (/\bconsole\.(log|debug)\(/.test(l)) logs.push(`${f}:${i + 1}`);
        });
    }
    assert.deepEqual(logs, []);
});

test("no `any` types in the frontend", () => {
    const found = [];
    for (const f of FRONTEND) {
        lines(f).forEach((l, i) => {
            if (/(:\s*any\b|\bas any\b|<any>|\bany\[\])/.test(l)) found.push(`${f}:${i + 1}: ${l.trim()}`);
        });
    }
    assert.deepEqual(found, []);
});

test("no placeholder names such as John Doe", () => {
    const found = FRONTEND.filter((f) => /John Doe/.test(readFileSync(join(root, f), "utf8")));
    assert.deepEqual(found, []);
});
