// SEC-10: the Security row on the Overview dashboard and the failed-access alert, as code.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const dashboard = JSON.parse(read("infra/monitoring/dashboards/vmenu-overview.json"));
const alerts = JSON.parse(read("infra/monitoring/alerts/vmenu-alerts.json"));

test("the Overview dashboard has a Security row with failures by reason and by service", () => {
    const row = dashboard.panels.findIndex((p) => p.type === "row" && p.title === "Security");
    assert.ok(row >= 0, "a Security row");
    const next = dashboard.panels.findIndex((p, i) => i > row && p.type === "row");
    const all = dashboard.panels
        .slice(row + 1, next < 0 ? undefined : next)
        .flatMap((p) => p.targets ?? [])
        .map((t) => t.expr)
        .join("\n");
    assert.match(all, /sum by \(reason\) \(increase\(vmenu_auth_failures_total\{[^}]*env="\$env"/);
    assert.match(all, /sum by \(service\) \(increase\(vmenu_auth_failures_total\{[^}]*env="\$env"/);
});

test("an alert fires when failed access jumps: more than 50 in 5 minutes", () => {
    const rule = alerts.rules.find((r) => r.uid === "vmenu-auth-failures-spike");
    assert.ok(rule, "rule vmenu-auth-failures-spike");
    assert.match(
        rule.data[0].model.expr,
        /sum by \(env\) \(increase\(vmenu_auth_failures_total\{[^}]*env=~"staging\|prod"[^}]*\}\[5m\]\)\)/,
    );
    const threshold = rule.data.find((d) => d.model.type === "threshold");
    assert.deepEqual(threshold.model.conditions[0].evaluator, { type: "gt", params: [50] });
    assert.equal(rule.condition, threshold.refId);
});

test("the agent keeps the metric and doesn't duplicate its service label", () => {
    const alloy = read("infra/monitoring/config.alloy");
    const keep = /rule \{\s*source_labels = \["__name__"\]\s*regex\s*= "([^"]+)"\s*action\s*= "keep"/.exec(alloy);
    assert.match("vmenu_auth_failures_total", new RegExp(`^(?:${keep[1]})$`));
    // The scrape adds its own `service` label, so the metric's own would arrive as exported_service.
    assert.match(alloy, /regex\s*= "exported_service"/);
});
