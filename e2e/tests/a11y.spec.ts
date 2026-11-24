import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { KNOWN } from "./support/a11y-known";
import { signInAs, SLUG } from "./support/auth";
import { dishesOf } from "./support/menu";
import { PAGES, type PageContext } from "./support/pages";
import { ownTable, type OwnTable } from "./support/tables";

// B5: axe on every page of the app, in light and, where the page has dark styles, in dark. A
// "serious" or "critical" issue fails the test, unless it is in support/a11y-known.ts: the issues
// that were there when this check came in, which VM-36 fixes. A known issue that is gone is noted
// on the test, so the list can shrink.
const BLOCKING = ["serious", "critical"];

let table: OwnTable;
let context: PageContext;
test.beforeAll(async ({ baseURL, request }) => {
    table = await ownTable(baseURL!, "A11y");
    const [dish] = dishesOf(await (await request.get(`/api/menu/${SLUG}/public/items`)).json());
    const placed = await request.post(`/api/orders/${SLUG}`, {
        data: { table: table.name, orderedItems: [{ item: { _id: dish._id }, quantity: 2 }] },
    });
    expect(placed.status()).toBe(201);
    context = { table: table.name, token: table.qrToken, orderId: ((await placed.json()) as { _id: string })._id };
});
test.afterAll(async () => {
    await table.remove();
});

for (const p of PAGES) {
    for (const theme of ["light", "dark"] as const) {
        test(`${p.name} (${theme}) has no serious accessibility issues`, async ({ page, baseURL }) => {
            await page.addInitScript(
                ([theme, section]) => {
                    localStorage.setItem("vm-theme", theme);
                    if (section) localStorage.setItem("dashboardSection", section);
                },
                [theme, p.section ?? ""],
            );
            if (p.as) await signInAs(page.context(), baseURL!, p.as);
            // a cart with something in it
            await page.addInitScript(
                ([key]) => {
                    if (!localStorage.getItem(key))
                        localStorage.setItem(
                            key,
                            JSON.stringify([{ item: { _id: "x", name: "Kuy Teav", priceCents: 250, image: "" }, quantity: 1 }]),
                        );
                },
                [`cart:${SLUG}:${context.table}`],
            );
            await page.goto(p.path(context));
            await expect(p.ready(page)).toBeVisible({ timeout: 15_000 });
            const rendered = await page.evaluate(() => document.documentElement.dataset.theme);
            test.skip(theme === "dark" && rendered !== "dark", "this page is light only");
            // let enter animations finish, so colours are checked as the user sees them
            await page.waitForTimeout(500);

            const results = await new AxeBuilder({ page })
                .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
                .exclude("nextjs-portal") // Next's dev overlay, not the app
                .analyze();
            const blocking = results.violations.filter((v) => BLOCKING.includes(v.impact ?? ""));
            const known = KNOWN[`${p.name}:${theme}`] ?? [];
            const fresh = blocking
                .filter((v) => !known.includes(v.id))
                .map(
                    (v) =>
                        `${v.id} (${v.impact}): ${v.help}, at ${v.nodes
                            .map((n) => n.target.join(" "))
                            .slice(0, 3)
                            .join(", ")}`,
                );
            const gone = known.filter((id) => !blocking.some((v) => v.id === id));
            if (gone.length)
                test.info().annotations.push({
                    type: "fixed",
                    description: `no longer found, remove from a11y-known.ts: ${gone.join(", ")}`,
                });
            expect(fresh, `new accessibility issues on ${p.name} (${theme})`).toEqual([]);
        });
    }
}
