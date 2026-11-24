#!/usr/bin/env node
// B7: checks that a deployed site has the demo restaurant the post-deploy tests use. Run after
// each staging deploy, before the browser tests, so a missing seed fails with a clear message
// instead of a timeout.
//
//   node scripts/check-demo-data.mjs <base-url>      (SLUG=demo-bistro, TABLE=T1 by default)
//
// Exits 1 if the restaurant, its dishes or its table are missing.
import { appendFileSync } from "node:fs";

const base = process.argv[2];
if (!base) {
    console.error("usage: check-demo-data.mjs <base-url>");
    process.exit(2);
}
const slug = process.env.SLUG ?? "demo-bistro";
const table = process.env.TABLE ?? "T1";
const FIX = 'Load it once: Actions → Deploy → Run workflow on staging, environment "staging", the current tag, and tick "Load demo data".';

async function get(path) {
    const url = new URL(path, base).href;
    try {
        const res = await fetch(url, { headers: { accept: "application/json" } });
        return { status: res.status, body: await res.json().catch(() => null) };
    } catch (e) {
        return { status: 0, body: { message: `could not reach ${url} (${e.cause?.code ?? e.message})` } };
    }
}
const reason = (r) => r.body?.message ?? `HTTP ${r.status}`;

const problems = [];
let dishes = 0;
const menu = await get(`/api/menu/${slug}/public/items`);
if (menu.status === 0) {
    problems.push(reason(menu));
} else if (menu.status !== 200) {
    problems.push(
        `The demo restaurant "${slug}" is missing: GET /api/menu/${slug}/public/items answered ${menu.status} "${reason(menu)}". ${FIX}`,
    );
} else {
    // VM-25 groups the menu by category; older services answered a flat list.
    const items = Array.isArray(menu.body) ? menu.body : (menu.body?.categories ?? []).flatMap((c) => c.items ?? []);
    dishes = items.length;
    if (!dishes) problems.push(`"${slug}" has no dishes on its menu. ${FIX}`);
    const tableRes = await get(`/api/menu/${slug}/public/tables/${encodeURIComponent(table)}`);
    if (tableRes.status !== 200) problems.push(`"${slug}" has no table ${table} (${tableRes.status} "${reason(tableRes)}"). ${FIX}`);
}

const md = [
    "### Demo data",
    "",
    problems.length
        ? problems.map((p) => `- ❌ ${p}`).join("\n")
        : `- ✅ \`${slug}\` is there with ${dishes} dishes and table ${table} (${base})`,
    "",
].join("\n");
if (problems.length) for (const p of problems) console.error(`::error::${p}`);
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
process.exit(problems.length ? 1 : 0);
