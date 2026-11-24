// VM-36: Lighthouse's accessibility score for the customer menu must be at least 90.
// Run with the stack up: `BASE_URL=http://localhost:3550 npm --prefix e2e run lighthouse`.
// It opens the seeded table T1 (only reads; no order is placed), runs Lighthouse in Playwright's Chromium,
// prints the score and any failing audits, and exits 1 under the minimum.
import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";

const MIN = 0.9;
const BASE = process.env.BASE_URL ?? "http://localhost:3400"; // as in playwright.config.ts
const SLUG = process.env.SLUG ?? "demo-bistro";
const PORT = 9333;

const TABLE = process.env.TABLE ?? "T1";
const browser = await chromium.launch({ args: [`--remote-debugging-port=${PORT}`] });
let score = 0;
try {
    const url = `${BASE}/${SLUG}/customer/${TABLE}`;
    const result = await lighthouse(
        url,
        { port: PORT, onlyCategories: ["accessibility"], output: "json", logLevel: "error" },
        {
            extends: "lighthouse:default",
            settings: {
                formFactor: "mobile",
                screenEmulation: { mobile: true, width: 360, height: 780, deviceScaleFactor: 2, disabled: false },
            },
        },
    );
    const { categories, audits } = result.lhr;
    score = categories.accessibility.score ?? 0;
    console.log(`Lighthouse accessibility for ${url.replace(BASE, "")}: ${Math.round(score * 100)} (minimum ${MIN * 100})`);
    for (const ref of categories.accessibility.auditRefs) {
        const audit = audits[ref.id];
        if (ref.weight > 0 && audit.score !== null && audit.score < 1) console.log(`  failing: ${audit.id}: ${audit.title}`);
    }
} finally {
    await browser.close();
}
process.exit(score >= MIN ? 0 : 1);
