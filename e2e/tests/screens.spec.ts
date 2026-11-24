import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { signInAs, SLUG } from "./support/auth";
import { dishesOf, type Dish } from "./support/menu";
import { PAGES } from "./support/pages";

// B5: screenshot tests of the main screens (VM-33 to VM-35), in light and dark. The reference
// images are in e2e/screens/; a PR that changes one says why.
//
// The screens show recorded data, so other specs' orders can't change them: every /api call is
// answered from e2e/screens/data/<screen>.har, and the clock is fixed at the time of recording.
// Screenshots differ between operating systems, so the references are made on Linux, in the
// Playwright image, as CI runs them:
//   npm run screens              (compare; needs a running stack, see e2e/scripts/screens.sh)
//   npm run screens -- --update-snapshots    (new references, after a deliberate change)
//   RECORD_SCREENS=1 npm run screens  (record the data again; then --update-snapshots)
const here = dirname(fileURLToPath(import.meta.url));
const DATA = join(here, "..", "screens", "data");
const RECORD = process.env.RECORD_SCREENS === "1";
/** Recorded addresses use this origin; replaying swaps in the stack's own. */
const ORIGIN = "http://vmenu.test";

test.skip(process.platform !== "linux", "screenshot references are made on Linux: run `npm run screens` (Docker)");

interface Fixtures {
    /** when the data was recorded; the page's clock is fixed a little after it */
    recordedAt: number;
    /** two dishes from the menu, for the cart */
    cart: { item: Dish; quantity: number }[];
}
const fixturesFile = join(DATA, "fixtures.json");
const fixtures = (): Fixtures => JSON.parse(readFileSync(fixturesFile, "utf8")) as Fixtures;

test.beforeAll(async ({ request }) => {
    if (!RECORD) return;
    const [a, b] = dishesOf(await (await request.get(`/api/menu/${SLUG}/public/items`)).json());
    const data: Fixtures = {
        recordedAt: Date.now(),
        cart: [
            { item: a!, quantity: 2 },
            { item: b!, quantity: 1 },
        ],
    };
    writeFileSync(fixturesFile, `${JSON.stringify(data, null, 4)}\n`);
});

// The recorded data keeps only what replaying needs: no cookies, and of the headers only the
// content type, so no session token ends up in the repo.
test.afterAll(() => {
    if (!RECORD) return;
    for (const file of readdirSync(DATA).filter((f) => f.endsWith(".har"))) {
        const har = JSON.parse(readFileSync(join(DATA, file), "utf8"));
        for (const e of har.log.entries) {
            e.request.url = `${ORIGIN}${new URL(e.request.url).pathname}${new URL(e.request.url).search}`;
            e.request.headers = [];
            e.request.cookies = [];
            e.response.cookies = [];
            e.response.headers = e.response.headers.filter((h: { name: string }) => h.name.toLowerCase() === "content-type");
        }
        writeFileSync(join(DATA, file), `${JSON.stringify(har, null, 1)}\n`);
    }
});

interface Screen {
    name: string;
    path: string;
    as?: "owner" | "cashier" | "chef";
    storage?: Record<string, string>;
    /** something that shows once the data is in */
    ready: (page: Page) => Locator;
    /** also at phone width (360 px) */
    phone?: boolean;
}

const SCREENS: Screen[] = [
    {
        name: "customer-menu",
        path: `/${SLUG}/customer/T1`,
        phone: true,
        ready: (p) => p.getByRole("button", { name: "Add to Cart" }).first(),
    },
    { name: "cart", path: `/${SLUG}/customer/T1/cart`, phone: true, ready: (p) => p.getByRole("button", { name: "Place Order" }) },
    { name: "kitchen", path: `/${SLUG}/kitchen`, as: "chef", ready: (p) => p.getByRole("region", { name: "New" }) },
    ...(["overview", "tables", "orders", "menu"] as const).map((section): Screen => ({
        name: `cashier-${section}`,
        path: `/${SLUG}/cashier/dashboard`,
        as: "cashier",
        storage: { dashboardSection: section },
        ready: PAGES.find((p) => p.name === `cashier-${section}`)!.ready,
    })),
    {
        name: "owner-overview",
        path: "/owner",
        as: "owner",
        storage: { activeTab: "overview" },
        ready: (p) => p.getByRole("heading", { name: /overview/i }).first(),
    },
];

const VIEWPORTS = { desktop: { width: 1280, height: 800 }, phone: { width: 360, height: 780 } };

for (const screen of SCREENS) {
    for (const theme of ["light", "dark"] as const) {
        for (const size of screen.phone ? (["desktop", "phone"] as const) : (["desktop"] as const)) {
            const shot = `${screen.name}-${theme}${screen.phone ? `-${size}` : ""}.png`;
            test(`${shot}`, async ({ page, baseURL }) => {
                const har = join(DATA, `${screen.name}.har`);
                test.skip(!RECORD && !existsSync(har), `no recorded data: ${har}`);
                await page.setViewportSize(VIEWPORTS[size]);
                if (RECORD) await page.routeFromHAR(har, { url: "**/api/**", update: true, updateContent: "embed", updateMode: "minimal" });
                else {
                    const local = test.info().outputPath(`${screen.name}.har`);
                    writeFileSync(local, readFileSync(har, "utf8").replaceAll(ORIGIN, new URL(baseURL!).origin));
                    await page.routeFromHAR(local, { url: "**/api/**", notFound: "abort" });
                }
                if (!RECORD) await page.clock.setFixedTime(fixtures().recordedAt + 5 * 60_000);
                const storage = {
                    "vm-theme": theme,
                    [`cart:${SLUG}:T1`]: JSON.stringify(RECORD || existsSync(fixturesFile) ? fixtures().cart : []),
                    ...screen.storage,
                };
                await page.addInitScript((items) => {
                    for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v);
                }, storage);
                if (screen.as) await signInAs(page.context(), baseURL!, screen.as);

                await page.goto(screen.path);
                await expect(screen.ready(page)).toBeVisible({ timeout: 15_000 });
                await page.waitForLoadState("networkidle").catch(() => {});
                await page.evaluate(() => document.fonts.ready);
                await page.waitForTimeout(800); // enter animations
                test.skip(RECORD, "recording the data; run again without RECORD_SCREENS for the pictures");
                await expect(page).toHaveScreenshot(shot, {
                    // the first screen of it: long lists of recorded orders would only add noise
                    fullPage: false,
                    stylePath: join(here, "support", "screens.css"),
                    maxDiffPixelRatio: 0.01,
                });
            });
        }
    }
}
