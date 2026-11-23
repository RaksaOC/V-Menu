// SEC-09: security scanning in the pipeline. Run with `npm run test:repo`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const { summarize } = await import("./security-summary.mjs").catch(() => ({}));

const sarif = (...levels) => ({
    runs: [
        {
            results: levels.map((level, i) => ({
                level,
                ruleId: `rules.r${i}`,
                locations: [{ physicalLocation: { artifactLocation: { uri: `src/f${i}.ts` }, region: { startLine: i + 1 } } }],
            })),
        },
    ],
});
const zap = (...alerts) => ({ site: [{ "@name": "https://staging.example", alerts }] });
const alert = (pluginid, riskcode, name = `Alert ${pluginid}`) => ({ pluginid, riskcode: String(riskcode), alert: name, name, count: "2" });

test("the summary script exists", () => assert.equal(typeof summarize, "function"));

test("Semgrep: errors are high and block; warnings are listed but don't", () => {
    const r = summarize("semgrep", sarif("error", "warning", "note"));
    assert.equal(r.counts.high, 1);
    assert.equal(r.counts.medium, 1);
    assert.equal(r.blocking.length, 1);
    assert.match(r.markdown, /### Security: Semgrep/);
    assert.match(r.markdown, /src\/f0\.ts:1/);
    assert.equal(summarize("semgrep", sarif("warning")).blocking.length, 0);
    assert.match(summarize("semgrep", sarif()).markdown, /No findings/);
});

test("ZAP: only High alerts that aren't on the known list block", () => {
    const report = zap(alert("10038", 2, "CSP header not set"), alert("40012", 3, "XSS (reflected)"), alert("90001", 3, "Known one"));
    const r = summarize("zap", report, { known: ["90001"] });
    assert.equal(r.counts.high, 2);
    assert.equal(r.counts.medium, 1);
    assert.deepEqual(
        r.blocking.map((b) => b.id),
        ["40012"],
    );
    assert.match(r.markdown, /### Security: OWASP ZAP baseline/);
    assert.equal(summarize("zap", zap(alert("10038", 2))).blocking.length, 0);
});

test("npm audit and Trivy: counts by severity, high and critical block", () => {
    const audit = { metadata: { vulnerabilities: { info: 0, low: 1, moderate: 2, high: 1, critical: 0, total: 4 } } };
    const a = summarize("npm-audit", audit, { label: "frontend" });
    assert.deepEqual([a.counts.high, a.counts.medium, a.counts.low], [1, 2, 1]);
    assert.equal(a.blocking.length, 1);
    assert.match(a.markdown, /npm audit \(frontend\)/);
    const trivy = {
        Results: [
            {
                Target: "img",
                Vulnerabilities: [
                    { VulnerabilityID: "CVE-1", Severity: "CRITICAL", PkgName: "openssl", FixedVersion: "3.0.1" },
                    { VulnerabilityID: "CVE-2", Severity: "LOW", PkgName: "x" },
                ],
            },
        ],
    };
    const t = summarize("trivy", trivy, { label: "menu-service" });
    assert.equal(t.counts.critical, 1);
    assert.equal(t.blocking.length, 1);
    assert.equal(summarize("trivy", { Results: [] }).blocking.length, 0);
});

test("every summary links to the run", () => {
    process.env.GITHUB_SERVER_URL = "https://github.com";
    process.env.GITHUB_REPOSITORY = "o/r";
    process.env.GITHUB_RUN_ID = "42";
    assert.match(summarize("semgrep", sarif()).markdown, /https:\/\/github\.com\/o\/r\/actions\/runs\/42/);
});

test("code scanning runs Semgrep on every PR with the three rule sets, failing on new high findings", () => {
    const wf = read(".github/workflows/code-scanning.yml");
    assert.match(wf, /pull_request/);
    for (const set of ["p/typescript", "p/nodejs", "p/react"]) assert.ok(wf.includes(set), set);
    assert.match(wf, /--baseline-commit/);
    assert.match(wf, /security-summary\.mjs semgrep .*--fail-on-high/);
    assert.match(wf, /upload-sarif/);
    assert.match(wf, /security-events: write/);
});

test("ZAP baseline runs against staging after a staging deploy, keeps its report and fails on new High alerts", () => {
    const wf = read(".github/workflows/deploy.yml");
    assert.match(wf, /zap-baseline\.py/);
    assert.match(wf, /needs: deploy/);
    assert.match(wf, /== 'staging'/);
    assert.match(wf, /upload-artifact/);
    assert.match(wf, /security-summary\.mjs zap .*--known \.zap\/known-high\.txt.*--fail-on-high/);
    assert.doesNotMatch(wf, /zap-full-scan|zap-api-scan/, "passive baseline only, no attacks");
});

test("npm audit and Trivy put a Security summary in their jobs", () => {
    assert.match(read(".github/workflows/ci.yml"), /security-summary\.mjs npm-audit/);
    assert.match(read(".github/workflows/release.yml"), /security-summary\.mjs trivy/);
});
