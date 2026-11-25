#!/usr/bin/env node
// B3: a short coverage table in the CI job summary.
//
//   node infra/checks/coverage-summary.mjs coverage/coverage-summary.json --label <name>
//        [--minimum <n> | --config vitest.config.ts] [--target <n>]
//
// --config reads the lines minimum from the package's vitest config, so the number lives in one
// place. The markdown goes to $GITHUB_STEP_SUMMARY (or stdout). A missing report is not an error:
// the test step has already failed and said why.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const METRICS = ["lines", "statements", "functions", "branches"];

/** Pure: coverage-summary.json contents in, markdown out. */
export function coverageMarkdown(summary, { label, minimum, target }) {
    const t = summary.total;
    const lines = [`### Coverage: ${label}`, "", "| Metric | % | Covered |", "|---|---|---|"];
    for (const k of METRICS) lines.push(`| ${k} | ${t[k].pct}% | ${t[k].covered}/${t[k].total} |`);
    lines.push("");
    const parts = [];
    if (minimum !== undefined) parts.push(`Minimum: ${minimum}% of lines (CI fails below it).`);
    if (target !== undefined) {
        parts.push(`Target: ${target}%.`);
        const gap = Math.ceil(target - t.lines.pct);
        if (gap > 0) parts.push(`${gap} points to the ${target}% target.`);
    }
    if (parts.length) lines.push(parts.join(" "), "");
    return lines.join("\n");
}

/** The lines threshold in a vitest config: `thresholds: { lines: 87, ...`. */
export const minimumFromConfig = (text) => {
    const n = /thresholds:\s*{\s*lines:\s*(\d+)/.exec(text)?.[1];
    return n === undefined ? undefined : Number(n);
};

function main(argv) {
    const [file, ...rest] = argv;
    const opt = (name) => {
        const i = rest.indexOf(name);
        return i >= 0 ? rest[i + 1] : undefined;
    };
    const label = opt("--label") ?? "tests";
    const out = (md) => (process.env.GITHUB_STEP_SUMMARY ? appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`) : console.log(md));
    if (!file || !existsSync(file)) {
        console.log(`no coverage report for ${label}`);
        return 0;
    }
    const config = opt("--config");
    const minimum =
        opt("--minimum") !== undefined
            ? Number(opt("--minimum"))
            : config && existsSync(config)
              ? minimumFromConfig(readFileSync(config, "utf8"))
              : undefined;
    const target = opt("--target") !== undefined ? Number(opt("--target")) : undefined;
    out(coverageMarkdown(JSON.parse(readFileSync(file, "utf8")), { label, minimum, target }));
    return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = main(process.argv.slice(2));
