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

// The server has 2 shared CPUs and can be slow; on 24 Nov Alloy needed about 3 minutes to start
// while the staging stack redeployed at the same time, and the deploy gave up after 2.
test("the monitoring deploy gives a slow server time to start Alloy", () => {
    const deploy = read("infra/monitoring/deploy.sh");
    const wait = Number(/--wait-timeout (\d+)/.exec(deploy)?.[1]);
    assert.ok(wait >= 300, `deploy.sh waits ${wait}s; allow at least 300s`);

    const compose = read("infra/monitoring/compose.yml");
    const alloy = compose.slice(compose.indexOf("\n  alloy:"), compose.indexOf("\nnetworks:"));
    const start = /start_period: (\d+)s/.exec(alloy)?.[1];
    assert.ok(Number(start) >= 180, `Alloy's start_period is ${start}s; allow at least 180s`);
    assert.match(alloy, /start_interval: \ds/, "keep polling every few seconds while it starts");
    const cpus = Number(/cpus: "([\d.]+)"/.exec(alloy)?.[1]);
    assert.ok(cpus >= 0.5, `Alloy is capped at ${cpus} CPU; give it at least 0.5 to start up`);
// On 24 Nov a staging deploy rolled back because menu-service needed about 75s to boot on the busy
// server and its health check gave it 20s. Every image gets 3 minutes, still polled every few seconds.
test("the app images give a slow server time to start before a failed check counts", () => {
    const files = ["restaurant", "menu", "order"].map((s) => `backend/services/${s}/Dockerfile`).concat("frontend/Dockerfile");
    for (const f of files) {
        const check = /^HEALTHCHECK (.*)$/m.exec(read(f))?.[1] ?? "";
        const start = Number(/--start-period=(\d+)s/.exec(check)?.[1]);
        assert.ok(start >= 180, `${f}: start period is ${start}s; allow at least 180s`);
        assert.match(check, /--start-interval=\ds/, `${f}: keep polling every few seconds while it starts`);
    }
});
