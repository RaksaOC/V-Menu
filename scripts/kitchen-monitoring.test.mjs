// B10: the Kitchen row on the Overview dashboard and the "order pending too long" alert, as code.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const dashboard = JSON.parse(read("infra/monitoring/dashboards/vmenu-overview.json"));
const alerts = JSON.parse(read("infra/monitoring/alerts/vmenu-alerts.json"));
const exprs = (panel) => (panel.targets ?? []).map((t) => t.expr).join("\n");

test("the Overview dashboard has a Kitchen row", () => {
    const rows = dashboard.panels.filter((p) => p.type === "row").map((p) => p.title);
    assert.ok(rows.includes("Kitchen"), `rows: ${rows.join(", ")}`);
});

test("the Kitchen row shows orders by status and the 95th percentile time to ready", () => {
    const row = dashboard.panels.findIndex((p) => p.type === "row" && p.title === "Kitchen");
    const next = dashboard.panels.findIndex((p, i) => i > row && p.type === "row");
    const kitchen = dashboard.panels.slice(row + 1, next < 0 ? undefined : next);
    const all = kitchen.map(exprs).join("\n");
    assert.match(all, /sum by \(status\) \(increase\(vmenu_orders_total\{[^}]*env="\$env"[^}]*\}/);
    assert.match(all, /histogram_quantile\(0\.95, sum by \(le\) \(rate\(vmenu_order_ready_seconds_bucket\{[^}]*env="\$env"/);
    assert.match(all, /vmenu_orders_pending_oldest_seconds/);
    assert.match(all, /vmenu_image_uploads_total/);
    assert.match(all, /vmenu_orders_rate_limited_total/);
});

test("panel ids are unique and the panels don't overlap", () => {
    const ids = dashboard.panels.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
    const cells = new Set();
    for (const p of dashboard.panels) {
        const { x, y, w, h } = p.gridPos;
        for (let i = x; i < x + w; i++)
            for (let j = y; j < y + h; j++) {
                assert.ok(!cells.has(`${i},${j}`), `${p.title} overlaps another panel at ${i},${j}`);
                cells.add(`${i},${j}`);
            }
    }
});

test("an alert fires when an order has been pending for more than 15 minutes", () => {
    const rule = alerts.rules.find((r) => r.uid === "vmenu-order-pending-too-long");
    assert.ok(rule, "rule vmenu-order-pending-too-long");
    assert.match(rule.data[0].model.expr, /vmenu_orders_pending_oldest_seconds\{[^}]*env=~"staging\|prod"/);
    const threshold = rule.data.find((d) => d.model.type === "threshold");
    assert.deepEqual(threshold.model.conditions[0].evaluator, { type: "gt", params: [900] });
    assert.equal(rule.condition, threshold.refId);
});

test("the monitoring agent keeps the new vmenu_ metrics", () => {
    const alloy = read("infra/monitoring/config.alloy");
    const keep = /rule \{\s*source_labels = \["__name__"\]\s*regex\s*= "([^"]+)"\s*action\s*= "keep"/.exec(alloy);
    assert.ok(keep, "the services keep-list");
    const re = new RegExp(`^(?:${keep[1]})$`);
    for (const name of [
        "vmenu_orders_total",
        "vmenu_order_ready_seconds_bucket",
        "vmenu_order_ready_seconds_count",
        "vmenu_orders_rate_limited_total",
        "vmenu_orders_pending_oldest_seconds",
        "vmenu_image_uploads_total",
    ])
        assert.match(name, re, `${name} is dropped by config.alloy`);
});
