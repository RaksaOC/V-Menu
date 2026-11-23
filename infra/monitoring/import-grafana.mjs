// Loads the dashboards and alert rules in this folder into Grafana. Safe to run again:
// it updates what is already there.
//
//   GRAFANA_URL=https://<stack>.grafana.net GRAFANA_SA_TOKEN=glsa_... node monitoring/import-grafana.mjs
//
// The token comes from a Grafana service account with the Editor role, not from the
// write-only token Alloy uses.
import { readdirSync, readFileSync } from "node:fs";

const { GRAFANA_URL, GRAFANA_SA_TOKEN } = process.env;
if (!GRAFANA_URL || !GRAFANA_SA_TOKEN) {
    console.error("Set GRAFANA_URL and GRAFANA_SA_TOKEN first.");
    process.exit(1);
}

const here = (path) => new URL(path, import.meta.url);
const base = GRAFANA_URL.replace(/\/$/, "");
const headers = {
    Authorization: `Bearer ${GRAFANA_SA_TOKEN}`,
    "Content-Type": "application/json",
    "X-Disable-Provenance": "true", // keeps the rules editable in the Grafana UI
};

async function api(method, path, body, okStatuses = []) {
    const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok && !okStatuses.includes(res.status)) throw new Error(`${method} ${path}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
    return res;
}

const alerts = JSON.parse(readFileSync(here("./alerts/vmenu-alerts.json"), "utf8"));
const { folder } = alerts;

// 409 and 412 mean the folder already exists.
await api("POST", "/api/folders", folder, [409, 412]);

for (const file of readdirSync(here("./dashboards/")).filter((f) => f.endsWith(".json"))) {
    const dashboard = JSON.parse(readFileSync(here(`./dashboards/${file}`), "utf8"));
    await api("POST", "/api/dashboards/db", { dashboard, folderUid: folder.uid, overwrite: true, message: "monitoring/import-grafana.mjs" });
    console.log(`dashboard: ${dashboard.title}`);
}

await api("PUT", `/api/v1/provisioning/folder/${folder.uid}/rule-groups/${alerts.group}`, {
    title: alerts.group,
    folderUid: folder.uid,
    interval: alerts.intervalSeconds,
    rules: alerts.rules.map((rule) => ({ ...rule, folderUID: folder.uid, ruleGroup: alerts.group, orgID: 1 })),
});
console.log(`alert rules: ${alerts.rules.length}`);
