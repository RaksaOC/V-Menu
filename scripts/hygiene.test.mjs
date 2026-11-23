// CL-12: repo hygiene. Run with `npm run test:repo` (CI: the `test (repo)` job).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const pkg = JSON.parse(read("package.json"));

test("no .DS_Store files are tracked, and generated folders are ignored", () => {
    const tracked = execSync("git ls-files", { cwd: root, encoding: "utf8" }).split("\n").filter((f) => f.endsWith(".DS_Store"));
    assert.deepEqual(tracked, []);
    const ignore = read(".gitignore");
    for (const entry of [".DS_Store", "coverage/", "playwright-report/", "test-results/"]) {
        assert.ok(ignore.split("\n").includes(entry), `.gitignore should list ${entry}`);
    }
});

test("one root command for each job, and `check` runs them all", () => {
    for (const name of ["test", "test:e2e", "lint", "typecheck", "format", "format:check", "check"]) {
        assert.ok(pkg.scripts[name], `root package.json needs a "${name}" script`);
    }
    for (const part of ["backend", "frontend", "test:repo"]) assert.match(pkg.scripts.test, new RegExp(part));
    for (const part of ["format:check", "lint", "typecheck", "npm test"]) assert.ok(pkg.scripts.check.includes(part), `check should run ${part}`);
});

test("shared editor and formatter settings", () => {
    assert.ok(existsSync(join(root, ".editorconfig")));
    const prettier = JSON.parse(read(".prettierrc.json"));
    assert.equal(prettier.tabWidth, 4);
    assert.ok(pkg.devDependencies.prettier);
});

test("the formatting commit is hidden from git blame", () => {
    const revs = read(".git-blame-ignore-revs").split("\n").filter((l) => /^[0-9a-f]{40}$/.test(l));
    assert.ok(revs.length >= 1, "list the formatting commit");
    for (const rev of revs) {
        const subject = execSync(`git log -1 --format=%s ${rev}`, { cwd: root, encoding: "utf8" });
        assert.match(subject, /format/i);
    }
});

test("CI runs the same formatting check", () => {
    assert.match(read(".github/workflows/ci.yml"), /npm run format:check/);
});
