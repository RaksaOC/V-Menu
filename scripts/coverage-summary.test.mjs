import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const { coverageMarkdown } = await import("../infra/checks/coverage-summary.mjs");

const total = (pct) => ({
    total: Object.fromEntries(
        ["lines", "statements", "functions", "branches"].map((k) => [k, { pct, covered: Math.floor(pct), total: 100 }]),
    ),
});

test("a table of the four numbers, the minimum and the target", () => {
    const md = coverageMarkdown(total(87.4), { label: "restaurant-service", minimum: 87, target: 80 });
    assert.match(md, /### Coverage: restaurant-service/);
    assert.match(md, /\| lines \| 87\.4% \| 87\/100 \|/);
    assert.match(md, /Minimum: 87% of lines \(CI fails below it\)\. Target: 80%\./);
});

test("says when the target is not reached yet", () => {
    assert.match(coverageMarkdown(total(35), { label: "frontend", minimum: 34, target: 60 }), /25 points to the 60% target/);
    assert.doesNotMatch(coverageMarkdown(total(90), { label: "x", minimum: 90, target: 80 }), /points to/);
});

test("CLI appends to the job summary, and copes with a missing report", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cov-"));
    const out = join(dir, "summary.md");
    writeFileSync(out, "");
    writeFileSync(join(dir, "coverage-summary.json"), JSON.stringify(total(50)));
    const env = { ...process.env, GITHUB_STEP_SUMMARY: out };
    await run(
        process.execPath,
        [
            "infra/checks/coverage-summary.mjs",
            join(dir, "coverage-summary.json"),
            "--label",
            "frontend",
            "--minimum",
            "34",
            "--target",
            "60",
        ],
        { env },
    );
    assert.match(readFileSync(out, "utf8"), /### Coverage: frontend/);
    const { stdout } = await run(process.execPath, ["infra/checks/coverage-summary.mjs", join(dir, "missing.json"), "--label", "x"], {
        env,
    });
    assert.match(stdout, /no coverage report/);
});
