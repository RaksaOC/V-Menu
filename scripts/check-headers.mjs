#!/usr/bin/env node
// SEC-02: checks that web pages send the security headers. Used after each staging deploy.
//
//   node scripts/check-headers.mjs <base-url> [path ...]     (default paths: /)
//
// Exits 1 and lists what's missing if any page lacks a header. A Content-Security-Policy in
// either form (enforced or report-only) counts.
import { appendFileSync } from "node:fs";

const REQUIRED = ["strict-transport-security", "x-content-type-options", "referrer-policy", "permissions-policy", "x-frame-options"];

const [base, ...paths] = process.argv.slice(2);
if (!base) {
    console.error("usage: check-headers.mjs <base-url> [path ...]");
    process.exit(2);
}

const rows = [];
let missingAny = false;
for (const path of paths.length ? paths : ["/"]) {
    const url = new URL(path, base).href;
    let res;
    try {
        res = await fetch(url, { redirect: "manual" });
    } catch (e) {
        rows.push(`| \`${path}\` | could not load (${e.message}) |`);
        missingAny = true;
        continue;
    }
    const missing = REQUIRED.filter((h) => !res.headers.has(h));
    const csp = res.headers.has("content-security-policy")
        ? "enforced"
        : res.headers.has("content-security-policy-report-only")
          ? "report-only"
          : "";
    if (!csp) missing.push("content-security-policy");
    if (missing.length) missingAny = true;
    rows.push(`| \`${path}\` | ${res.status} | ${missing.length ? `missing: ${missing.join(", ")}` : "all present"} | ${csp || "none"} |`);
}

const md = ["### Security headers", "", `Checked ${base}`, "", "| Page | Status | Headers | CSP |", "|---|---|---|---|", ...rows, ""].join(
    "\n",
);
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
process.exit(missingAny ? 1 : 0);
