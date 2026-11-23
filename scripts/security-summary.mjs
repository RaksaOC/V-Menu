#!/usr/bin/env node
// SEC-09: one "Security" summary for every scanner in the pipeline, and the rule for when a
// scan fails the job.
//
//   node scripts/security-summary.mjs <tool> <report> [--label <name>] [--known <file>] [--fail-on-high]
//
//   tool: semgrep (SARIF), zap (ZAP -J JSON), npm-audit (npm audit --json), trivy (trivy --format json)
//
// The markdown goes to $GITHUB_STEP_SUMMARY (or stdout). With --fail-on-high the script exits 1
// when there is a blocking finding: a Semgrep error, a ZAP High alert not listed in --known, or
// a high or critical npm / Trivy vulnerability. Reports never include secret values; Semgrep and
// ZAP findings are listed by rule and location only.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const TITLES = { semgrep: "Semgrep", zap: "OWASP ZAP baseline", "npm-audit": "npm audit", trivy: "Trivy" };
const LIST_LIMIT = 15;

function runLink() {
    const { GITHUB_SERVER_URL: server, GITHUB_REPOSITORY: repo, GITHUB_RUN_ID: run } = process.env;
    return server && repo && run ? `${server}/${repo}/actions/runs/${run}` : "";
}

function fromSemgrep(sarif) {
    // A SARIF result may leave out its level; then it's the rule's default level, and if the
    // rule has none either, "warning" (SARIF 2.1.0, 3.27.10). Semgrep leaves it out.
    const results = (sarif.runs ?? []).flatMap((run) => {
        const rules = run.tool?.driver?.rules ?? [];
        return (run.results ?? []).map((r) => {
            const rule = rules[r.ruleIndex] ?? rules.find((x) => x.id === r.ruleId);
            return { ...r, level: r.level ?? rule?.defaultConfiguration?.level ?? "warning" };
        });
    });
    const findings = results.map((r) => {
        const loc = r.locations?.[0]?.physicalLocation;
        const where = loc ? `${loc.artifactLocation?.uri}:${loc.region?.startLine ?? "?"}` : "";
        const severity = r.level === "error" ? "high" : r.level === "warning" ? "medium" : "low";
        return { id: r.ruleId, title: String(r.ruleId).split(".").pop(), where, severity };
    });
    return { findings, blocking: findings.filter((f) => f.severity === "high") };
}

function fromZap(report, known) {
    const risk = { 3: "high", 2: "medium", 1: "low", 0: "info" };
    const findings = (report.site ?? []).flatMap((site) =>
        (site.alerts ?? []).map((a) => ({
            id: String(a.pluginid),
            title: a.alert ?? a.name,
            where: `${site["@name"]} (${a.count ?? "?"} URLs)`,
            severity: risk[Number(a.riskcode)] ?? "info",
        })),
    );
    return { findings, blocking: findings.filter((f) => f.severity === "high" && !known.includes(f.id)) };
}

function fromNpmAudit(report) {
    const v = report.metadata?.vulnerabilities ?? {};
    const counts = { critical: v.critical ?? 0, high: v.high ?? 0, medium: v.moderate ?? 0, low: v.low ?? 0, info: v.info ?? 0 };
    const findings = Object.entries(report.vulnerabilities ?? {}).map(([name, x]) => ({
        id: name,
        title: name,
        where: x.fixAvailable ? "fix available" : "no fix yet",
        severity: x.severity === "moderate" ? "medium" : x.severity,
    }));
    let blocking = findings.filter((f) => f.severity === "high" || f.severity === "critical");
    // the counts are what npm audit's own exit code goes by, so they win if the list is missing
    if (!blocking.length && counts.critical + counts.high > 0) blocking = [{ id: "npm-audit", severity: "high" }];
    return { findings, blocking, counts };
}

function fromTrivy(report) {
    const findings = (report.Results ?? []).flatMap((r) =>
        (r.Vulnerabilities ?? []).map((v) => ({
            id: v.VulnerabilityID,
            title: `${v.PkgName} ${v.InstalledVersion ?? ""}`.trim(),
            where: v.FixedVersion ? `fixed in ${v.FixedVersion}` : "no fix yet",
            severity: String(v.Severity).toLowerCase(),
        })),
    );
    return { findings, blocking: findings.filter((f) => f.severity === "critical" || f.severity === "high") };
}

/** Pure: report data in, { counts, blocking, markdown } out. */
export function summarize(tool, data, { label = "", known = [] } = {}) {
    const parsed =
        tool === "semgrep"
            ? fromSemgrep(data)
            : tool === "zap"
              ? fromZap(data, known)
              : tool === "npm-audit"
                ? fromNpmAudit(data)
                : tool === "trivy"
                  ? fromTrivy(data)
                  : null;
    if (!parsed) throw new Error(`unknown tool: ${tool}`);
    const counts = parsed.counts ?? { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    if (!parsed.counts) for (const f of parsed.findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    const lines = [`### Security: ${TITLES[tool]}${label ? ` (${label})` : ""}`, ""];
    if (total === 0) lines.push("No findings.");
    else {
        lines.push("| Critical | High | Medium | Low | Info |", "|---|---|---|---|---|");
        lines.push(`| ${counts.critical} | ${counts.high} | ${counts.medium} | ${counts.low} | ${counts.info} |`, "");
        const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        const shown = [...parsed.findings].sort((a, b) => order[a.severity] - order[b.severity]).slice(0, LIST_LIMIT);
        for (const f of shown)
            lines.push(`- **${f.severity}** ${f.title}${f.where ? ` · \`${f.where}\`` : ""}${known.includes(f.id) ? " (known)" : ""}`);
        if (parsed.findings.length > LIST_LIMIT) lines.push(`- ... and ${parsed.findings.length - LIST_LIMIT} more in the report`);
    }
    lines.push("", parsed.blocking.length ? `**${parsed.blocking.length} blocking finding(s).**` : "Nothing blocking.");
    const link = runLink();
    if (link) lines.push("", `Full report: ${link}`);
    return { counts, blocking: parsed.blocking, markdown: `${lines.join("\n")}\n` };
}

function main(argv) {
    const [tool, file, ...rest] = argv;
    const opt = (name) => {
        const i = rest.indexOf(name);
        return i >= 0 ? rest[i + 1] : undefined;
    };
    if (!tool || !file) {
        console.error("usage: security-summary.mjs <semgrep|zap|npm-audit|trivy> <report> [--label x] [--known file] [--fail-on-high]");
        return 2;
    }
    const knownFile = opt("--known");
    const known =
        knownFile && existsSync(knownFile)
            ? readFileSync(knownFile, "utf8")
                  .split("\n")
                  .map((l) => l.replace(/#.*/, "").trim())
                  .filter(Boolean)
            : [];
    let data;
    try {
        data = JSON.parse(readFileSync(file, "utf8"));
    } catch (e) {
        const msg = `### Security: ${TITLES[tool] ?? tool}\n\nThe report \`${file}\` could not be read (${e.message}).\n`;
        if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, msg);
        console.error(msg);
        return 1;
    }
    const { markdown, blocking } = summarize(tool, data, { label: opt("--label") ?? "", known });
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
    console.log(markdown);
    return rest.includes("--fail-on-high") && blocking.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = main(process.argv.slice(2));
