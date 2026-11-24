// The server's own health: CPU use has an alert next to memory and disk (from #138).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const alerts = JSON.parse(read("infra/monitoring/alerts/vmenu-alerts.json"));

test("an alert fires when the server's CPU is over 90% for 10 minutes", () => {
    const rule = alerts.rules.find((r) => r.uid === "vmenu-host-cpu");
    assert.ok(rule, "add the vmenu-host-cpu rule");
    assert.equal(rule.for, "10m");
    assert.equal(rule.labels.severity, "warning");
    const query = rule.data.find((d) => d.refId === "A").model.expr;
    assert.match(query, /node_cpu_seconds_total\{[^}]*host="server"[^}]*mode="idle"/);
    const threshold = rule.data.find((d) => d.model.type === "threshold");
    assert.deepEqual(threshold.model.conditions[0].evaluator, { type: "gt", params: [0.9] });
});

test("the monitoring agent keeps the idle CPU counter the alert reads", () => {
    const alloy = read("infra/monitoring/config.alloy");
    const drop = /regex\s*= "node_cpu_seconds_total;\(([^)]+)\)"\s*action\s*= "drop"/.exec(alloy);
    assert.ok(drop, "the agent's CPU drop rule");
    assert.ok(!drop[1].split("|").includes("idle"), "idle must not be dropped");
    assert.match(alloy, /regex\s*= "[^"]*\bnode_cpu_seconds_total\b[^"]*"\s*action\s*= "keep"/);
});

test("alert uids are unique", () => {
    const uids = alerts.rules.map((r) => r.uid);
    assert.equal(new Set(uids).size, uids.length);
});
