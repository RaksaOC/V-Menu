// Captures the screens for the before/after showcase (B11).
//
// Run it against a local stack with the demo data loaded (npm run dev, then npm run seed):
//   cd docs/showcase && npm install && npx playwright install chromium
//   PHASE=before node capture.ts        (or PHASE=after)
//
// Staff screens need an app token. The script signs one with the JWT_SECRET from
// backend/services/restaurant/.env, so it only works against a stack you run yourself.
// Every shot is taken with the same viewport, data and theme in both phases.
// Node 22.18+ runs this file directly (type stripping), so there is no build step.

import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type Page } from "playwright";
import { SignJWT } from "jose";
import { dishesOf, withoutDishes } from "../../e2e/tests/support/menu.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const BASE = process.env.BASE_URL ?? "http://localhost:3400";
const PHASE = process.env.PHASE ?? "before";
const OUT = join(here, PHASE);
const SLUG = "demo-bistro";
const RES_ID = "64b000000000000000000001";
const TABLE = "T1";

const PHONE = { width: 360, height: 780 };
const DESKTOP = { width: 1280, height: 800 };

mkdirSync(OUT, { recursive: true });

function jwtSecret(): string {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
    const env = readFileSync(join(root, "backend/services/restaurant/.env"), "utf8");
    const line = env.split(/\r?\n/).find((l) => l.startsWith("JWT_SECRET="));
    if (!line) throw new Error("JWT_SECRET not found; set it or create backend/services/restaurant/.env");
    return line.slice("JWT_SECRET=".length).trim();
}

type Role = "owner" | "cashier" | "chef";
async function tokenFor(role: Role): Promise<string> {
    const user =
        role === "owner"
            ? { uid: "demo-owner", email: "owner@demo.local", role }
            : { uid: "demo-owner", email: "owner@demo.local", role, resId: RES_ID, resSlug: SLUG };
    return new SignJWT({ ...user })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer("v-menu")
        .setIssuedAt()
        .setExpirationTime("2h")
        .sign(new TextEncoder().encode(jwtSecret()));
}

// A ~1 MB JPEG made in the browser, so the VM-02 shot needs no file in the repo.
async function photoFixture(page: Page): Promise<string> {
    const file = join(OUT, "..", "fixture-photo.jpg");
    if (existsSync(file)) return file;
    const b64 = await page.evaluate(async () => {
        const c = document.createElement("canvas");
        c.width = 1600;
        c.height = 1200;
        const ctx = c.getContext("2d")!;
        const img = ctx.createImageData(c.width, c.height);
        let s = 42;
        for (let i = 0; i < img.data.length; i += 4) {
            s = (s * 1103515245 + 12345) & 0x7fffffff;
            img.data[i] = s & 255;
            img.data[i + 1] = (s >> 8) & 255;
            img.data[i + 2] = (s >> 16) & 255;
            img.data[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
        const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.8));
        const buf = new Uint8Array(await blob.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        return btoa(bin);
    });
    writeFileSync(file, Buffer.from(b64, "base64"));
    return file;
}

interface Ctx {
    page: Page;
    theme: "light" | "dark";
    width: number;
}

async function newPage(browser: Browser, vp: { width: number; height: number }, theme: "light" | "dark", role?: Role) {
    const context = await browser.newContext({ viewport: vp, colorScheme: theme, reducedMotion: "reduce" });
    const token = role ? await tokenFor(role) : null;
    if (token) {
        const url = new URL(BASE);
        await context.addCookies([{ name: "token", value: token, domain: url.hostname, path: "/", httpOnly: true, sameSite: "Lax" }]);
    }
    await context.addInitScript(
        ([t, th]) => {
            try {
                localStorage.setItem("vm-theme", th as string);
                if (t) localStorage.setItem("token", t as string);
            } catch {}
        },
        [token, theme],
    );
    return { context, page: await context.newPage() };
}

const results: string[] = [];
async function shot(c: Ctx, name: string, fullPage = true) {
    const suffix = c.theme === "dark" ? "-dark" : "";
    const file = join(OUT, `${name}-${c.width}${suffix}.png`);
    await c.page.waitForTimeout(800);
    await c.page.screenshot({ path: file, fullPage, animations: "disabled" });
    results.push(`ok   ${name}-${c.width}${suffix}`);
}

// ONLY=<regex> runs just the matching steps, e.g. ONLY="CL-10" for one ticket's shots.
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
async function step(label: string, fn: () => Promise<void>) {
    if (ONLY && !ONLY.test(label)) return;
    try {
        await fn();
    } catch (err) {
        results.push(`FAIL ${label}: ${(err as Error).message.split("\n")[0]}`);
    }
}

async function settle(page: Page) {
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
}

const browser = await chromium.launch();

// ---------------------------------------------------------------- customer journey
for (const vp of [PHONE, DESKTOP]) {
    for (const theme of ["light", "dark"] as const) {
        await step(`customer ${vp.width} ${theme}`, async () => {
            const { context, page } = await newPage(browser, vp, theme);
            const c = { page, theme, width: vp.width };
            await page.goto(`${BASE}/${SLUG}/customer/${TABLE}`);
            await settle(page);
            await shot(c, "VM-33-customer-menu");
            if (theme === "light") {
                // Add the first two dishes and open the cart.
                const add = page.getByRole("button", { name: /add|\+/i });
                for (let i = 0; i < 2; i++)
                    await add
                        .nth(i)
                        .click({ timeout: 5000 })
                        .catch(() => {});
                await page.goto(`${BASE}/${SLUG}/customer/${TABLE}/cart`);
                await settle(page);
                await shot(c, "VM-33-customer-cart");
                const place = page.getByRole("button", { name: /place order|order now|confirm/i }).first();
                await place.click({ timeout: 5000 });
                await page.waitForTimeout(600);
                await shot(c, "VM-07-order-placed", false);
                await page.waitForTimeout(2500);
                await shot(c, "VM-07-after-order", false);
            }
            await context.close();
        });
    }
}

// CL-10: the toast a customer sees after adding a dish (one shared style, light and dark).
for (const theme of ["light", "dark"] as const) {
    await step(`CL-10 toast ${theme}`, async () => {
        const { context, page } = await newPage(browser, PHONE, theme);
        await page.goto(`${BASE}/${SLUG}/customer/${TABLE}`);
        await settle(page);
        await page.getByRole("button", { name: /add/i }).first().click({ timeout: 5000 });
        await page.locator(".Toastify__toast").first().waitFor({ timeout: 5000 });
        await page.waitForTimeout(300);
        await page.screenshot({
            path: join(OUT, `CL-10-toast-added-to-cart-${PHONE.width}${theme === "dark" ? "-dark" : ""}.png`),
            animations: "disabled",
        });
        results.push(`ok   CL-10-toast-added-to-cart-${PHONE.width}${theme === "dark" ? "-dark" : ""}`);
        await context.close();
    });
}

// VM-04: what a customer sees when the table can't be used: closed, unknown table, unknown
// restaurant, and a server error. T4 is closed for the shot and opened again afterwards.
for (const theme of ["light", "dark"] as const) {
    await step(`VM-04 customer states ${theme}`, async () => {
        const staff = await newPage(browser, PHONE, theme, "cashier");
        const tables: { _id: string; name: string }[] = await (await staff.page.request.get(`${BASE}/api/menu/${SLUG}/tables`)).json();
        const t4 = tables.find((t) => t.name === "T4")!;
        const setOpen = (isEnabled: boolean) =>
            staff.page.request.patch(`${BASE}/api/menu/${SLUG}/tables/${t4._id}/availability`, { data: { isEnabled } });
        const { context, page } = await newPage(browser, PHONE, theme);
        const c = { page, theme, width: PHONE.width };
        try {
            await setOpen(false);
            await page.goto(`${BASE}/${SLUG}/customer/T4`);
            await settle(page);
            await shot(c, "VM-04-closed-table", false);
        } finally {
            await setOpen(true);
        }
        await page.goto(`${BASE}/${SLUG}/customer/NO-SUCH-TABLE`);
        await settle(page);
        await shot(c, "VM-04-unknown-table", false);
        await page.goto(`${BASE}/no-such-restaurant/customer/T1`);
        await settle(page);
        await shot(c, "VM-04-unknown-restaurant", false);
        await page.route(`**/api/menu/${SLUG}/public/tables/**`, (route) =>
            route.fulfill({
                status: 503,
                contentType: "application/json",
                body: JSON.stringify({ message: "A required service is unavailable" }),
            }),
        );
        await page.goto(`${BASE}/${SLUG}/customer/T1`);
        await settle(page);
        await page.waitForTimeout(1500);
        await shot(c, "VM-04-server-error", false);
        await context.close();
        await staff.context.close();
    });
}

// VM-05: one cart per table. Add a dish at T1, then look at T1's cart (price with cents) and
// at T2's cart in the same browser (it must be empty).
for (const theme of ["light", "dark"] as const) {
    await step(`VM-05 cart per table ${theme}`, async () => {
        const { context, page } = await newPage(browser, PHONE, theme);
        const c = { page, theme, width: PHONE.width };
        await page.goto(`${BASE}/${SLUG}/customer/T1`);
        await settle(page);
        await page.getByRole("button", { name: "Add to Cart" }).first().click({ timeout: 5000 });
        await page.waitForTimeout(500);
        await page.goto(`${BASE}/${SLUG}/customer/T1/cart`);
        await settle(page);
        await shot(c, "VM-05-t1-cart", false);
        await page.goto(`${BASE}/${SLUG}/customer/T2/cart`);
        await settle(page);
        await shot(c, "VM-05-t2-cart", false);
        await context.close();
    });
}

// ---------------------------------------------------------------- kitchen
for (const theme of ["light", "dark"] as const) {
    await step(`kitchen ${theme}`, async () => {
        const { context, page } = await newPage(browser, DESKTOP, theme, "chef");
        await page.goto(`${BASE}/${SLUG}/kitchen`);
        await settle(page);
        await shot({ page, theme, width: DESKTOP.width }, "VM-34-kitchen");
        await context.close();
    });
}

// VM-10: the kitchen history. Before: every finished order ever, in one long list.
// After: 20 a page, newest first, with page controls at the bottom.
for (const [vp, theme] of [
    [DESKTOP, "light"],
    [DESKTOP, "dark"],
    [PHONE, "light"],
] as const) {
    await step(`VM-10 kitchen history ${vp.width} ${theme}`, async () => {
        const { context, page } = await newPage(browser, vp, theme, "chef");
        if (PHASE === "before" && vp === DESKTOP && theme === "light") {
            // enough finished orders for more than one page (both phases share the database)
            const menu = dishesOf(await (await page.request.get(`${BASE}/api/menu/${SLUG}/public/items`)).json());
            for (let i = 0; i < 25; i++) {
                const placed = await page.request.post(`${BASE}/api/orders/${SLUG}`, {
                    data: { table: "T1", orderedItems: [{ item: menu[i % menu.length], quantity: 1 + (i % 3) }] },
                });
                const { _id } = (await placed.json()) as { _id: string };
                // VM-27: step by step to served; an older backend only has /done
                const first = await page.request.patch(`${BASE}/api/orders/${SLUG}/kitchen/${_id}/status`, {
                    data: { status: "preparing" },
                });
                if (first.status() === 404) await page.request.patch(`${BASE}/api/orders/${SLUG}/kitchen/${_id}/done`);
                else
                    for (const status of ["ready", "served"])
                        await page.request.patch(`${BASE}/api/orders/${SLUG}/kitchen/${_id}/status`, { data: { status } });
            }
        }
        await page.goto(`${BASE}/${SLUG}/kitchen/history`);
        await settle(page);
        await page.waitForTimeout(800);
        await shot({ page, theme, width: vp.width }, "VM-10-kitchen-history");
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(400);
        await shot({ page, theme, width: vp.width }, "VM-10-kitchen-history-end");
        await context.close();
    });
}

// VM-11: the cashier is on Orders when a customer at T2 orders. Before: nothing changes until a
// reload. After: within 10 s the bill appears, marked NEW. Then the history view.
for (const [vp, theme] of [
    [DESKTOP, "light"],
    [DESKTOP, "dark"],
    [PHONE, "light"],
] as const) {
    await step(`VM-11 cashier live bills ${vp.width} ${theme}`, async () => {
        const { context, page } = await newPage(browser, vp, theme, "cashier");
        const all = (await (await page.request.get(`${BASE}/api/orders/${SLUG}/bills`)).json()) as {
            _id: string;
            table: string;
            isPaid: boolean;
        }[];
        for (const b of all.filter((b) => b.table === "T2" && !b.isPaid))
            await page.request.patch(`${BASE}/api/orders/${SLUG}/bills/${b._id}`, { data: { isPaid: true } });
        await context.addInitScript(() => localStorage.setItem("dashboardSection", "orders"));
        await page.goto(`${BASE}/${SLUG}/cashier/dashboard`);
        await settle(page);
        const menu = dishesOf(await (await page.request.get(`${BASE}/api/menu/${SLUG}/public/items`)).json());
        await page.request.post(`${BASE}/api/orders/${SLUG}`, {
            data: { table: "T2", orderedItems: [{ item: menu[0], quantity: 2 }] },
        });
        await page.waitForTimeout(11_000);
        await shot({ page, theme, width: vp.width }, "VM-11-orders-after-new-order");
        await page.getByRole("button", { name: /view order history/i }).click();
        await page.waitForTimeout(1500);
        await shot({ page, theme, width: vp.width }, "VM-11-order-history");
        await context.close();
    });
}

// VM-03: the kitchen when its sign-in ends, and when it can't reach the server.
for (const theme of ["light", "dark"] as const) {
    await step(`VM-03 kitchen ${theme}`, async () => {
        {
            const { context, page } = await newPage(browser, DESKTOP, theme, "chef");
            await page.goto(`${BASE}/${SLUG}/kitchen`);
            await settle(page);
            await context.clearCookies();
            await page.evaluate(() => localStorage.setItem("token", "ended.session.token"));
            await page.waitForTimeout(6000); // a few polls
            await settle(page);
            await shot({ page, theme, width: DESKTOP.width }, "VM-03-session-ended", false);
            await context.close();
        }
        {
            const { context, page } = await newPage(browser, DESKTOP, theme, "chef");
            await page.goto(`${BASE}/${SLUG}/kitchen`);
            await settle(page);
            await page.route(`**/api/orders/${SLUG}/kitchen`, (route) =>
                route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
            );
            await page.waitForTimeout(6000);
            await shot({ page, theme, width: DESKTOP.width }, "VM-03-connection-lost", false);
            await context.close();
        }
    });
}

// ---------------------------------------------------------------- cashier
for (const theme of ["light", "dark"] as const) {
    for (const section of ["overview", "tables", "orders", "menu"]) {
        await step(`cashier ${section} ${theme}`, async () => {
            const { context, page } = await newPage(browser, DESKTOP, theme, "cashier");
            await context.addInitScript((s) => localStorage.setItem("dashboardSection", s as string), section);
            await page.goto(`${BASE}/${SLUG}/cashier/dashboard`);
            await settle(page);
            const c = { page, theme, width: DESKTOP.width };
            await shot(c, `VM-35-cashier-${section}`);
            if (section === "tables" && theme === "light") {
                await page.getByRole("button", { name: /qr/i }).first().click({ timeout: 5000 });
                await page.waitForTimeout(800);
                await shot(c, "VM-01-cashier-view-qr-click", false);
            }
            await context.close();
        });
    }
}

// VM-01: "View QR Code" opens the table's QR code (cashier and owner), and the owner can print them all.
for (const [vp, theme] of [
    [DESKTOP, "light"],
    [DESKTOP, "dark"],
    [PHONE, "light"],
] as const) {
    await step(`VM-01 cashier ${vp.width} ${theme}`, async () => {
        const { context, page } = await newPage(browser, vp, theme, "cashier");
        await context.addInitScript(() => localStorage.setItem("dashboardSection", "tables"));
        await page.goto(`${BASE}/${SLUG}/cashier/dashboard`);
        await settle(page);
        await page
            .getByRole("button", { name: /view qr code/i })
            .first()
            .click({ timeout: 5000 });
        await page.waitForTimeout(800);
        await shot({ page, theme, width: vp.width }, "VM-01-cashier-qr", false);
        await context.close();
    });
}
for (const theme of ["light", "dark"] as const) {
    await step(`VM-01 owner ${theme}`, async () => {
        const { context, page } = await newPage(browser, DESKTOP, theme, "owner");
        await page.goto(`${BASE}/owner`);
        await settle(page);
        await page
            .getByRole("button", { name: /^\s*Tables\s*$/i })
            .first()
            .click({ timeout: 5000 });
        await settle(page);
        const c = { page, theme, width: DESKTOP.width };
        await shot(c, "VM-01-owner-tables", false);
        await page
            .getByRole("button", { name: /view qr code/i })
            .first()
            .click({ timeout: 5000 });
        await page.waitForTimeout(800);
        await shot(c, "VM-01-owner-qr", false);
        await context.close();
    });
}

// VM-02: the owner adds a dish with a ~1 MB phone-like photo; then the customer menu.
for (const [vp, theme] of [
    [DESKTOP, "light"],
    [DESKTOP, "dark"],
    [PHONE, "light"],
] as const) {
    await step(`VM-02 ${vp.width} ${theme}`, async () => {
        const { context, page } = await newPage(browser, vp, theme, "owner");
        const c = { page, theme, width: vp.width };
        await page.goto(`${BASE}/owner`);
        await settle(page);
        await page.getByRole("button", { name: "Menu", exact: true }).click({ timeout: 5000 });
        await settle(page);
        await page.getByRole("button", { name: "Add Item" }).click({ timeout: 5000 });
        await page.locator('input[type="file"]').setInputFiles(await photoFixture(page));
        await page.getByPlaceholder("Enter item name").fill("Showcase Dish");
        await page.getByPlaceholder("0.00").fill("4.5");
        const saved = page.waitForResponse((r) => r.url().endsWith("/items") && r.request().method() === "POST", { timeout: 15_000 });
        await page.getByRole("button", { name: "Save" }).click();
        const res = await saved.catch(() => null);
        if (vp === DESKTOP && theme === "light") {
            writeFileSync(
                join(OUT, "VM-02-add-item-response.txt"),
                `POST /items after choosing fixture-photo.jpg (${statSync(await photoFixture(page)).size} bytes) -> ${res ? `${res.status()} ${(await res.text()).slice(0, 300)}` : "no request"}\n`,
            );
        }
        await page.waitForTimeout(1200);
        await shot(c, "VM-02-owner-add-photo", false);
        const created = res && res.ok() ? await res.json() : null;
        await page.goto(`${BASE}/${SLUG}/customer/${TABLE}`);
        await settle(page);
        await page
            .getByRole("img", { name: "Showcase Dish" })
            .scrollIntoViewIfNeeded({ timeout: 3000 })
            .catch(() => {});
        await shot(c, "VM-02-customer-menu", false);
        if (created) await page.request.delete(`${BASE}/api/menu/${SLUG}/items/${created._id}`); // keep the demo data the same
        await context.close();
    });
}

// CL-09: the merged owner/cashier screens on the UI kit, an edit form in the shared Modal,
// and the kit page itself.
for (const theme of ["light", "dark"] as const) {
    await step(`CL-09 screens ${theme}`, async () => {
        for (const section of ["tables", "menu"]) {
            const { context, page } = await newPage(browser, DESKTOP, theme, "cashier");
            await context.addInitScript((s) => localStorage.setItem("dashboardSection", s as string), section);
            await page.goto(`${BASE}/${SLUG}/cashier/dashboard`);
            await settle(page);
            await shot({ page, theme, width: DESKTOP.width }, `CL-09-cashier-${section}`, false);
            await context.close();
        }
        const { context, page } = await newPage(browser, DESKTOP, theme, "owner");
        const c = { page, theme, width: DESKTOP.width };
        await page.goto(`${BASE}/owner`);
        await settle(page);
        await page
            .getByRole("button", { name: /^\s*Tables\s*$/i })
            .first()
            .click({ timeout: 5000 });
        await settle(page);
        await shot(c, "CL-09-owner-tables", false);
        await page
            .getByRole("button", { name: /edit table/i })
            .first()
            .click({ timeout: 5000 });
        await page.waitForTimeout(600);
        await shot(c, "CL-09-owner-edit-table", false);
        await page.goto(`${BASE}/owner`); // the old popups didn't close with Escape
        await settle(page);
        await page.getByRole("button", { name: "Menu", exact: true }).click({ timeout: 5000 });
        await settle(page);
        await shot(c, "CL-09-owner-menu", false);
        await context.close();

        const kit = await newPage(browser, DESKTOP, theme);
        await kit.page.goto(`${BASE}/ui-kit`);
        await settle(kit.page);
        await shot({ page: kit.page, theme, width: DESKTOP.width }, "CL-09-ui-kit");
        await kit.context.close();
    });
}
await step("CL-09 phone", async () => {
    const { context, page } = await newPage(browser, PHONE, "light", "cashier");
    await context.addInitScript(() => localStorage.setItem("dashboardSection", "tables"));
    await page.goto(`${BASE}/${SLUG}/cashier/dashboard`);
    await settle(page);
    await shot({ page, theme: "light", width: PHONE.width }, "CL-09-cashier-tables", false);
    await context.close();
});

// VM-06: what the customer sees when an order fails (the order API is mocked, the menu is real).
const ORDER_ERRORS = [
    ["closed", 409, { message: "Table is not available", code: "TABLE_CLOSED" }],
    ["down", 503, { message: "A required service is unavailable" }],
    ["sold-out", 409, { message: "Some items are no longer available", code: "ITEMS_UNAVAILABLE" }],
] as const;
for (const [vp, theme] of [
    [DESKTOP, "light"],
    [DESKTOP, "dark"],
    [PHONE, "light"],
] as const) {
    await step(`VM-06 order errors ${vp.width} ${theme}`, async () => {
        for (const [name, status, body] of ORDER_ERRORS) {
            const { context, page } = await newPage(browser, vp, theme);
            const raw = await (await page.request.get(`${BASE}/api/menu/${SLUG}/public/items`)).json();
            const menu = dishesOf(raw);
            const lines = menu.slice(0, 2).map((item) => ({ item, quantity: 1 }));
            await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [`cart:${SLUG}:T1`, JSON.stringify(lines)]);
            await page.route(`**/api/orders/${SLUG}`, (route) => route.fulfill({ status, json: body }));
            if (name === "sold-out")
                await page.route(`**/api/menu/${SLUG}/public/items`, (route) =>
                    route.fulfill({ json: withoutDishes(raw, (dish) => dish._id !== lines[1].item._id) }),
                );
            await page.goto(`${BASE}/${SLUG}/customer/T1/cart`);
            await settle(page);
            await page.getByRole("button", { name: /place order/i }).click();
            await page.waitForTimeout(1200);
            await shot({ page, theme, width: vp.width }, `VM-06-cart-${name}`, false);
            await context.close();
        }
    });
}

// VM-07: right after ordering. Before: a toast, then back to the menu. After: the confirmation.
for (const [vp, theme] of [
    [DESKTOP, "light"],
    [DESKTOP, "dark"],
    [PHONE, "light"],
] as const) {
    await step(`VM-07 after ordering ${vp.width} ${theme}`, async () => {
        // start from a settled table, so the list shows this visit only
        const staff = await newPage(browser, vp, theme, "cashier");
        const bills = (await (await staff.page.request.get(`${BASE}/api/orders/${SLUG}/bills`)).json()) as {
            _id: string;
            table: string;
            isPaid: boolean;
        }[];
        for (const b of bills.filter((b) => b.table === "T2" && !b.isPaid))
            await staff.page.request.patch(`${BASE}/api/orders/${SLUG}/bills/${b._id}`, { data: { isPaid: true } });
        await staff.context.close();

        const { context, page } = await newPage(browser, vp, theme);
        const menu = dishesOf(await (await page.request.get(`${BASE}/api/menu/${SLUG}/public/items`)).json());
        const lines = menu.slice(0, 2).map((item, i) => ({ item, quantity: i + 1 }));
        await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [`cart:${SLUG}:T2`, JSON.stringify(lines)]);
        await page.goto(`${BASE}/${SLUG}/customer/T2`); // like a customer: menu, then cart
        await settle(page);
        await page.goto(`${BASE}/${SLUG}/customer/T2/cart`);
        await settle(page);
        await page.getByRole("button", { name: /place order/i }).click();
        await page.waitForTimeout(1000);
        await shot({ page, theme, width: vp.width }, "VM-07-after-order", vp === PHONE);
        await page.waitForTimeout(2500); // before: back on the menu by now, nothing to show for the order
        await shot({ page, theme, width: vp.width }, "VM-07-after-order-3s", false);
        await context.close();
    });
}

// ---------------------------------------------------------------- owner
for (const theme of ["light", "dark"] as const) {
    await step(`owner ${theme}`, async () => {
        const { context, page } = await newPage(browser, DESKTOP, theme, "owner");
        await page.goto(`${BASE}/owner`);
        await settle(page);
        const c = { page, theme, width: DESKTOP.width };
        await shot(c, "VM-35-owner-overview");
        for (const tab of ["Tables", "Menu"]) {
            await page
                .getByRole("button", { name: new RegExp(`^\\s*${tab}\\s*$`, "i") })
                .first()
                .click({ timeout: 5000 });
            await settle(page);
            await shot(c, `VM-35-owner-${tab.toLowerCase()}`);
            if (theme !== "light") continue;
            if (tab === "Tables") {
                await page.getByRole("button", { name: /qr/i }).first().click({ timeout: 5000 });
                await page.waitForTimeout(800);
                await shot(c, "VM-01-owner-view-qr-click", false);
            }
            if (tab === "Menu") {
                // VM-02: add an item with a ~1 MB photo and record the API's answer.
                const photo = await photoFixture(page);
                await page
                    .getByRole("button", { name: /add (new )?item|add dish|new item/i })
                    .first()
                    .click({ timeout: 5000 });
                await page.waitForTimeout(500);
                const dialog = page.locator("form, [role=dialog]").last();
                await dialog.locator("input[type=text], input:not([type])").first().fill("Showcase Dish");
                await dialog.locator("input[type=number]").first().fill("4.5");
                await dialog.locator("input[type=file]").first().setInputFiles(photo);
                const answer = page.waitForResponse((r) => r.url().includes("/items") && r.request().method() === "POST", {
                    timeout: 10_000,
                });
                await dialog
                    .getByRole("button", { name: /save|add|create/i })
                    .last()
                    .click();
                const res = await answer.catch(() => null);
                const status = res ? `${res.status()} ${await res.text()}` : "no request";
                writeFileSync(
                    join(OUT, "VM-02-add-item-response.txt"),
                    `POST /items with fixture-photo.jpg (${statSync(photo).size} bytes) -> ${status}\n`,
                );
                await page.waitForTimeout(800);
                await shot(c, "VM-02-add-item-with-photo", false);
            }
        }
        await context.close();
    });
}

// VM-25: menu categories. The customer's sections, tabs and search; the owner's Categories popup and
// the category select; the cashier's filter. Shots of things that don't exist before are after-only.
for (const [vp, theme] of [
    [DESKTOP, "light"],
    [DESKTOP, "dark"],
    [PHONE, "light"],
] as const) {
    await step(`VM-25 ${vp.width} ${theme}`, async () => {
        const after = PHASE === "after";
        {
            const { context, page } = await newPage(browser, vp, theme);
            const c = { page, theme, width: vp.width };
            await page.goto(`${BASE}/${SLUG}/customer/${TABLE}`);
            await settle(page);
            await shot(c, "VM-25-customer-menu", false);
            if (after) await page.getByRole("navigation", { name: "Menu categories" }).getByRole("button", { name: "Drinks" }).click();
            else await page.getByText("Iced Coffee").scrollIntoViewIfNeeded();
            await page.waitForTimeout(900);
            await shot(c, "VM-25-customer-drinks", false);
            if (after) {
                await page.evaluate(() => window.scrollTo(0, 0));
                await page.getByRole("searchbox", { name: "Search dishes" }).fill("amok");
                await page.waitForTimeout(400);
                await shot(c, "VM-25-customer-search", false);
            }
            await context.close();
        }
        {
            const { context, page } = await newPage(browser, vp, theme, "owner");
            const c = { page, theme, width: vp.width };
            await page.goto(`${BASE}/owner`);
            await settle(page);
            await page.getByRole("button", { name: "Menu", exact: true }).click({ timeout: 5000 });
            await settle(page);
            await shot(c, "VM-25-owner-menu", false);
            if (after) {
                await page.getByRole("button", { name: "Categories" }).click();
                await page.waitForTimeout(500);
                await shot(c, "VM-25-owner-categories", false);
                await page.getByRole("button", { name: "Done" }).click();
            }
            await page.getByRole("button", { name: "Add Item" }).click({ timeout: 5000 });
            await page.waitForTimeout(500);
            await shot(c, "VM-25-owner-item-form", false);
            await context.close();
        }
        {
            const { context, page } = await newPage(browser, vp, theme, "cashier");
            await context.addInitScript(() => localStorage.setItem("dashboardSection", "menu"));
            await page.goto(`${BASE}/${SLUG}/cashier/dashboard`);
            await settle(page);
            if (after) await page.getByRole("group", { name: "Filter by category" }).getByRole("button", { name: "Drinks" }).click();
            await page.waitForTimeout(400);
            await shot({ page, theme, width: vp.width }, "VM-25-cashier-menu", false);
            await context.close();
        }
    });
}

// VM-27: order status. The kitchen's New / Preparing / Ready columns, the customer's live status,
// and the cashier's bill with each order's status and a cancelled order struck through.
const VM27: { ids: string[] } = { ids: [] };
for (const [vp, theme] of [
    [DESKTOP, "light"],
    [DESKTOP, "dark"],
    [PHONE, "light"],
] as const) {
    await step(`VM-27 ${vp.width} ${theme}`, async () => {
        const after = PHASE === "after";
        const kitchen = await newPage(browser, vp, theme, "chef");
        const cashier = await newPage(browser, vp, theme, "cashier");
        const api = (path: string) => `${BASE}/api/orders/${SLUG}${path}`;
        if (!VM27.ids.length) {
            // once per phase: clear the board and table T3, then three orders at T3
            if (after) {
                const queue = (await (await kitchen.page.request.get(api("/kitchen"))).json()) as { _id: string; status: string }[];
                for (const o of queue)
                    for (const status of ["preparing", "ready", "served"].slice(["pending", "preparing", "ready"].indexOf(o.status)))
                        await kitchen.page.request.patch(api(`/kitchen/${o._id}/status`), { data: { status } });
            }
            const open = (await (await cashier.page.request.get(api("/bills?status=open"))).json()) as { _id: string; table: string }[];
            for (const b of open.filter((b) => b.table === "T3"))
                await cashier.page.request.patch(api(`/bills/${b._id}`), { data: { isPaid: true } });
            const menu = dishesOf(await (await kitchen.page.request.get(`${BASE}/api/menu/${SLUG}/public/items`)).json());
            for (const [i, quantity] of [1, 2, 1].entries()) {
                const placed = await kitchen.page.request.post(api(""), {
                    data: { table: "T3", orderedItems: [{ item: { _id: menu[i % menu.length]._id }, quantity }] },
                });
                VM27.ids.push(((await placed.json()) as { _id: string })._id);
            }
            if (after) {
                const step = (id: string, status: string) => kitchen.page.request.patch(api(`/kitchen/${id}/status`), { data: { status } });
                await step(VM27.ids[1], "preparing");
                await step(VM27.ids[2], "preparing");
                await step(VM27.ids[2], "ready");
                const [bill] = (
                    (await (await cashier.page.request.get(api("/bills?status=open"))).json()) as { _id: string; table: string }[]
                ).filter((b) => b.table === "T3");
                await cashier.page.request.patch(api(`/bills/${bill._id}/orders/${VM27.ids[0]}/cancel`), {
                    data: { reason: "Guest changed their mind" },
                });
            }
        }
        await kitchen.page.goto(`${BASE}/${SLUG}/kitchen`);
        await settle(kitchen.page);
        await kitchen.page.waitForTimeout(600);
        await shot({ page: kitchen.page, theme, width: vp.width }, "VM-27-kitchen", vp === PHONE);
        await kitchen.page.goto(`${BASE}/${SLUG}/customer/T3/orders/${VM27.ids[2]}`);
        await settle(kitchen.page);
        await shot({ page: kitchen.page, theme, width: vp.width }, "VM-27-customer-status", false);
        await kitchen.context.close();

        await cashier.context.addInitScript(() => localStorage.setItem("dashboardSection", "orders"));
        await cashier.page.goto(`${BASE}/${SLUG}/cashier/dashboard`);
        await settle(cashier.page);
        const card = cashier.page.locator("article").filter({ has: cashier.page.getByRole("heading", { name: "Table T3" }) });
        await card.scrollIntoViewIfNeeded().catch(() => {});
        await cashier.page.waitForTimeout(400);
        await shot({ page: cashier.page, theme, width: vp.width }, "VM-27-cashier-bill", false);
        if (after) {
            await card.getByRole("button", { name: `Cancel order #${VM27.ids[1].slice(-6).toUpperCase()}` }).click();
            await cashier.page.waitForTimeout(300);
            await shot({ page: cashier.page, theme, width: vp.width }, "VM-27-cashier-cancel", false);
        }
        await cashier.context.close();
    });
}

// VM-13: after sign-up, "Check your inbox" until the email is verified. Needs an E2E build and
// the Firebase Auth emulator (B6); real Firebase is blocked, so it never makes a real account.
for (const [vp, theme] of [
    [DESKTOP, "light"],
    [DESKTOP, "dark"],
    [PHONE, "light"],
] as const) {
    await step(`VM-13 ${vp.width} ${theme}`, async () => {
        const { page, context } = await newPage(browser, vp, theme);
        await context.route(/^https:\/\/[a-z0-9-]+\.googleapis\.com\//, (route) => route.abort("blockedbyclient"));
        await page.goto(`${BASE}/signup`);
        await settle(page);
        await page.locator("form input[type=text]").nth(0).fill("Riverside Noodles");
        await page.locator("form input[type=text]").nth(1).fill("Dara");
        await page.locator("form input[type=email]").fill(`dara-${Date.now()}-${vp.width}-${theme}@e2e.test`);
        await page.locator("form input[type=password]").fill("e2e-password-1");
        await page.locator("form [type=submit]").click();
        await page.getByRole("heading", { name: "Check your inbox" }).waitFor({ timeout: 15_000 });
        await shot({ page, theme, width: vp.width }, "VM-13-check-inbox", false);
        await page.getByRole("button", { name: "I've verified my email" }).click();
        await page.getByText(/not verified yet/i).waitFor();
        await shot({ page, theme, width: vp.width }, "VM-13-not-verified-yet", false);
        await context.close();
    });
}

// VM-09: the owner's numbers. Table T4 gets one bill that's paid but whose order the kitchen never
// marked served (revenue after the fix, nothing before) and one served order on an open bill (revenue
// before the fix, not after). Then the owner's overview, the restaurants list and one restaurant.
const VM09 = { ready: false };
for (const [vp, theme] of [
    [DESKTOP, "light"],
    [DESKTOP, "dark"],
    [PHONE, "light"],
] as const) {
    await step(`VM-09 ${vp.width} ${theme}`, async () => {
        const shots: [string, string][] = [
            ["overview", "VM-09-owner-overview"],
            ["restaurants", "VM-09-owner-restaurants"],
            ["management", "VM-09-restaurant-overview"],
        ];
        if (!VM09.ready) {
            VM09.ready = true;
            const cashier = await newPage(browser, DESKTOP, "light", "cashier");
            const chef = await newPage(browser, DESKTOP, "light", "chef");
            const api = (path: string) => `${BASE}/api/orders/${SLUG}${path}`;
            const openT4 = async () =>
                ((await (await cashier.page.request.get(api("/bills?status=open"))).json()) as { _id: string; table: string }[]).filter(
                    (b) => b.table === "T4",
                );
            for (const b of await openT4()) await cashier.page.request.patch(api(`/bills/${b._id}`), { data: { isPaid: true } });
            const menu = dishesOf(await (await cashier.page.request.get(`${BASE}/api/menu/${SLUG}/public/items`)).json());
            const place = (quantity: number) =>
                cashier.page.request.post(api(""), { data: { table: "T4", orderedItems: [{ item: { _id: menu[1]._id }, quantity }] } });
            await place(2); // paid below, never served
            for (const b of await openT4()) await cashier.page.request.patch(api(`/bills/${b._id}`), { data: { isPaid: true } });
            const served = (await (await place(3)).json()) as { _id: string }; // served, bill left open
            for (const status of ["preparing", "ready", "served"])
                await chef.page.request.patch(api(`/kitchen/${served._id}/status`), { data: { status } });
            await cashier.context.close();
            await chef.context.close();
        }
        for (const [tab, name] of shots) {
            const { context, page } = await newPage(browser, vp, theme, "owner");
            await context.addInitScript((t) => localStorage.setItem("activeTab", t), tab);
            await page.goto(`${BASE}/owner`);
            await settle(page);
            await page.waitForTimeout(1200); // the cards fade in
            await shot({ page, theme, width: vp.width }, name, vp === PHONE);
            await context.close();
        }
    });
}

// VM-22: the message on the cart page when too many orders were placed. A real 429 from a stack on
// the default limits: each run uses its own address (as Caddy would send it) and places 10 orders
// first, so the 11th, from the cart, is refused. The screen is new: no "before" shot.
for (const [vp, theme, n] of [
    [DESKTOP, "light", 1],
    [DESKTOP, "dark", 2],
    [PHONE, "light", 3],
] as const) {
    await step(`VM-22 ${vp.width} ${theme}`, async () => {
        if (PHASE !== "after") return;
        const client = `198.18.22.${(Date.now() % 200) + n}`;
        const context = await browser.newContext({
            viewport: vp,
            colorScheme: theme,
            reducedMotion: "reduce",
            extraHTTPHeaders: { "X-Forwarded-For": client },
        });
        await context.addInitScript((th) => localStorage.setItem("vm-theme", th), theme);
        const page = await context.newPage();
        const menu = dishesOf(await (await page.request.get(`${BASE}/api/menu/${SLUG}/public/items`)).json());
        for (let i = 0; i < 10; i++) {
            const placed = await page.request.post(`${BASE}/api/orders/${SLUG}`, {
                data: { table: `T${(i % 4) + 1}`, orderedItems: [{ item: { _id: menu[0]._id }, quantity: 1 }] },
            });
            if (placed.status() !== 201) throw new Error(`order ${i + 1} answered ${placed.status()}`);
        }
        const lines = menu.slice(0, 2).map((item, i) => ({ item, quantity: i + 1 }));
        await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [`cart:${SLUG}:T2`, JSON.stringify(lines)]);
        await page.goto(`${BASE}/${SLUG}/customer/T2/cart`);
        await settle(page);
        await page.getByRole("button", { name: /place order/i }).click();
        await page.getByRole("alert").filter({ hasText: "wait a minute" }).waitFor({ timeout: 10_000 });
        await shot({ page, theme, width: vp.width }, "VM-22-cart-too-many-orders", false);
        await context.close();
    });
}

// CL-07: the same order on the screens that show money and dates: the kitchen card, the cashier's
// bill and invoice, and the customer's confirmation. Dates and times now read the same everywhere,
// in the restaurant's time zone.
const CL07: { id?: string } = {};
for (const [vp, theme] of [
    [DESKTOP, "light"],
    [DESKTOP, "dark"],
    [PHONE, "light"],
] as const) {
    await step(`CL-07 ${vp.width} ${theme}`, async () => {
        const kitchen = await newPage(browser, vp, theme, "chef");
        const cashier = await newPage(browser, vp, theme, "cashier");
        const api = (path: string) => `${BASE}/api/orders/${SLUG}${path}`;
        if (!CL07.id) {
            const open = (await (await cashier.page.request.get(api("/bills?status=open"))).json()) as { _id: string; table: string }[];
            for (const b of open.filter((b) => b.table === "T2"))
                await cashier.page.request.patch(api(`/bills/${b._id}`), { data: { isPaid: true } });
            const queue = (await (await kitchen.page.request.get(api("/kitchen"))).json()) as { _id: string; status: string }[];
            for (const o of queue)
                for (const status of ["preparing", "ready", "served"].slice(["pending", "preparing", "ready"].indexOf(o.status)))
                    await kitchen.page.request.patch(api(`/kitchen/${o._id}/status`), { data: { status } });
            const menu = dishesOf(await (await kitchen.page.request.get(`${BASE}/api/menu/${SLUG}/public/items`)).json());
            const placed = await kitchen.page.request.post(api(""), {
                data: {
                    table: "T2",
                    orderedItems: [
                        { item: { _id: menu[0]._id }, quantity: 3 },
                        { item: { _id: menu[1]._id }, quantity: 1 },
                    ],
                },
            });
            CL07.id = ((await placed.json()) as { _id: string })._id;
        }
        await kitchen.page.goto(`${BASE}/${SLUG}/kitchen`);
        await settle(kitchen.page);
        await shot({ page: kitchen.page, theme, width: vp.width }, "CL-07-kitchen", false);
        await kitchen.page.goto(`${BASE}/${SLUG}/customer/T2/orders/${CL07.id}`);
        await settle(kitchen.page);
        await shot({ page: kitchen.page, theme, width: vp.width }, "CL-07-customer-order", false);
        await kitchen.context.close();

        await cashier.context.addInitScript(() => localStorage.setItem("dashboardSection", "orders"));
        await cashier.page.goto(`${BASE}/${SLUG}/cashier/dashboard`);
        await settle(cashier.page);
        const card = cashier.page.locator("article").filter({ has: cashier.page.getByRole("heading", { name: "Table T2" }) });
        await card.scrollIntoViewIfNeeded();
        await shot({ page: cashier.page, theme, width: vp.width }, "CL-07-cashier-bill", false);
        await cashier.context.close();
    });
}

// VM-31: the cashier's bill and invoice for a table with the same dish on two orders. The bill's
// total and the invoice's merged lines come from the server.
const VM31 = { ready: false };
for (const [vp, theme] of [
    [DESKTOP, "light"],
    [DESKTOP, "dark"],
    [PHONE, "light"],
] as const) {
    await step(`VM-31 ${vp.width} ${theme}`, async () => {
        const cashier = await newPage(browser, vp, theme, "cashier");
        const api = (path: string) => `${BASE}/api/orders/${SLUG}${path}`;
        if (!VM31.ready) {
            VM31.ready = true;
            const open = (await (await cashier.page.request.get(api("/bills?status=open"))).json()) as { _id: string; table: string }[];
            for (const b of open) await cashier.page.request.patch(api(`/bills/${b._id}`), { data: { isPaid: true } });
            const menu = dishesOf(await (await cashier.page.request.get(`${BASE}/api/menu/${SLUG}/public/items`)).json());
            for (const lines of [
                [{ item: { _id: menu[0]._id }, quantity: 2 }],
                [
                    { item: { _id: menu[0]._id }, quantity: 1 },
                    { item: { _id: menu[3]._id }, quantity: 3 },
                ],
            ])
                await cashier.page.request.post(api(""), { data: { table: "T3", orderedItems: lines } });
        }
        await cashier.context.addInitScript(() => localStorage.setItem("dashboardSection", "orders"));
        await cashier.page.goto(`${BASE}/${SLUG}/cashier/dashboard`);
        await settle(cashier.page);
        const card = cashier.page.locator("article").filter({ has: cashier.page.getByRole("heading", { name: "Table T3" }) });
        await card.getByRole("button", { name: "View Invoice" }).scrollIntoViewIfNeeded();
        await shot({ page: cashier.page, theme, width: vp.width }, "VM-31-cashier-bill", false);
        await card.getByRole("button", { name: "View Invoice" }).click();
        await cashier.page.getByRole("dialog").waitFor();
        await shot({ page: cashier.page, theme, width: vp.width }, "VM-31-invoice", false);
        await cashier.context.close();
    });
}

// VM-24: the invoice, the owner's Preferences (currency and payment QR), and a customer's menu.
// The "after" run sets "Both" and uploads a QR that says DEMO ONLY (not a payment account) through
// the real form, then puts the demo restaurant back to US dollars.
const VM24 = { ready: false, set: false };
async function paymentQrFixture(): Promise<string> {
    const file = join(OUT, "..", "fixture-payment-qr.png");
    if (!existsSync(file)) {
        const { createRequire } = await import("node:module");
        const QRCode = createRequire(import.meta.url)("../../frontend/node_modules/qrcode");
        await QRCode.toFile(file, "DEMO ONLY - not a payment account", { width: 480, margin: 2 });
    }
    return file;
}
for (const [vp, theme] of [
    [DESKTOP, "light"],
    [DESKTOP, "dark"],
    [PHONE, "light"],
] as const) {
    await step(`VM-24 ${vp.width} ${theme}`, async () => {
        const owner = await newPage(browser, vp, theme, "owner");
        await owner.page.goto(`${BASE}/owner`);
        await settle(owner.page);
        await owner.page.getByRole("button", { name: "Preferences" }).click({ timeout: 5000 });
        await settle(owner.page);
        if (PHASE === "after" && !VM24.set) {
            VM24.set = true;
            await owner.page.getByRole("radio", { name: /Both/ }).check();
            await owner.page.getByLabel("Riel per US dollar").fill("4100");
            await owner.page.getByLabel("Upload payment QR").setInputFiles(await paymentQrFixture());
            await owner.page.getByRole("img", { name: "Payment QR" }).waitFor({ timeout: 15_000 });
            await owner.page.getByRole("button", { name: "Save settings" }).click();
            await owner.page.getByText("Saved").waitFor({ timeout: 10_000 });
        }
        // a viewport shot: a full-page one paints the owner's sticky header halfway down
        await owner.page.getByRole("heading", { name: "Preferences" }).scrollIntoViewIfNeeded();
        await owner.page.mouse.wheel(0, vp === PHONE ? 0 : 280);
        await settle(owner.page);
        await shot({ page: owner.page, theme, width: vp.width }, "VM-24-preferences", false);
        await owner.context.close();

        const cashier = await newPage(browser, vp, theme, "cashier");
        const api = (path: string) => `${BASE}/api/orders/${SLUG}${path}`;
        if (!VM24.ready) {
            VM24.ready = true;
            const open = (await (await cashier.page.request.get(api("/bills?status=open"))).json()) as { _id: string; table: string }[];
            for (const b of open.filter((b) => b.table === "T3"))
                await cashier.page.request.patch(api(`/bills/${b._id}`), { data: { isPaid: true } });
            const menu = dishesOf(await (await cashier.page.request.get(`${BASE}/api/menu/${SLUG}/public/items`)).json());
            for (const lines of [
                [{ item: { _id: menu[0]._id }, quantity: 2 }],
                [
                    { item: { _id: menu[0]._id }, quantity: 1 },
                    { item: { _id: menu[3]._id }, quantity: 3 },
                ],
            ])
                await cashier.page.request.post(api(""), { data: { table: "T3", orderedItems: lines } });
        }
        await cashier.context.addInitScript(() => localStorage.setItem("dashboardSection", "orders"));
        await cashier.page.goto(`${BASE}/${SLUG}/cashier/dashboard`);
        await settle(cashier.page);
        const card = cashier.page.locator("article").filter({ has: cashier.page.getByRole("heading", { name: "Table T3" }) });
        await card.getByRole("button", { name: "View Invoice" }).click();
        await cashier.page.getByRole("dialog").waitFor();
        await settle(cashier.page);
        await shot({ page: cashier.page, theme, width: vp.width }, "VM-24-invoice", false);
        await cashier.context.close();

        const customer = await newPage(browser, vp, theme);
        await customer.page.goto(`${BASE}/${SLUG}/customer/T1`);
        await settle(customer.page);
        await customer.page.getByText(/^\$\d/).first().scrollIntoViewIfNeeded();
        await customer.page.mouse.wheel(0, 120);
        await settle(customer.page);
        await shot({ page: customer.page, theme, width: vp.width }, "VM-24-customer-menu", false);
        await customer.context.close();
    });
}
if (PHASE === "after" && VM24.set) {
    await step("VM-24 reset to US dollars", async () => {
        const owner = await newPage(browser, DESKTOP, "light", "owner");
        const res = await owner.page.request.put(`${BASE}/api/restaurants/${SLUG}/settings`, {
            data: { currency: "USD", khrPerUsd: 4100, paymentQrUrl: null },
        });
        if (!res.ok()) throw new Error(`reset failed: ${res.status()}`);
        await owner.context.close();
    });
}

// VM-28: notes in the cart ("no chilli") and on the kitchen card, highlighted.
const VM28 = { number: "" };
for (const [vp, theme] of [
    [DESKTOP, "light"],
    [DESKTOP, "dark"],
    [PHONE, "light"],
] as const) {
    await step(`VM-28 ${vp.width} ${theme}`, async () => {
        const customer = await newPage(browser, vp, theme);
        const menu = dishesOf(await (await customer.page.request.get(`${BASE}/api/menu/${SLUG}/public/items`)).json());
        const dish = menu[2] ?? menu[0];
        await customer.context.addInitScript(([key, lines]) => localStorage.setItem(key, lines), [
            `cart:${SLUG}:T2`,
            JSON.stringify([
                { item: dish, quantity: 1 },
                { item: dish, quantity: 2 },
            ]),
        ] as const);
        await customer.page.goto(`${BASE}/${SLUG}/customer/T2/cart`);
        await settle(customer.page);
        const lineNote = customer.page.getByRole("textbox", { name: /^Note for / }).first();
        if (await lineNote.count()) {
            await lineNote.fill("No chilli");
            await customer.page.getByRole("textbox", { name: "Note for the kitchen" }).fill("Birthday, please bring a candle");
        }
        await shot({ page: customer.page, theme, width: vp.width }, "VM-28-cart", false);
        if (!VM28.number) {
            const res = await customer.page.request.post(`${BASE}/api/orders/${SLUG}`, {
                data: {
                    table: "T2",
                    note: "Birthday, please bring a candle",
                    orderedItems: [
                        { item: { _id: dish._id }, quantity: 1, note: "No chilli" },
                        { item: { _id: dish._id }, quantity: 2 },
                    ],
                },
            });
            VM28.number = String((await res.json())._id)
                .slice(-6)
                .toUpperCase();
        }
        await customer.context.close();

        const chef = await newPage(browser, vp, theme, "chef");
        await chef.page.goto(`${BASE}/${SLUG}/kitchen`);
        await settle(chef.page);
        const card = chef.page.locator("article").filter({ hasText: `Order #${VM28.number}` });
        await card.scrollIntoViewIfNeeded();
        await settle(chef.page);
        await shot({ page: chef.page, theme, width: vp.width }, "VM-28-kitchen-card", false);
        await chef.context.close();
    });
}

// VM-29: the kitchen board with orders of three ages (just now, 7 min, 20 min), and kiosk mode.
// Making orders older changes the local database: only when backend/services/order/.env is there.
async function ageOrders(ages: Record<string, number>) {
    const envFile = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "backend", "services", "order", ".env");
    if (!existsSync(envFile)) return;
    const uri = readFileSync(envFile, "utf8")
        .match(/^MONGODB_URI=(.*)$/m)?.[1]
        ?.trim();
    if (!uri) return;
    const { createRequire } = await import("node:module");
    const mongoose = createRequire(import.meta.url)("../../backend/node_modules/mongoose");
    const conn = await mongoose.createConnection(uri).asPromise();
    try {
        for (const [id, minutes] of Object.entries(ages)) {
            const at = new Date(Date.now() - minutes * 60_000);
            await conn.collection("orders").updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { createdAt: at, orderedAt: at } });
        }
    } finally {
        await conn.close();
    }
}
const VM29 = { ready: false };
for (const [vp, theme] of [
    [DESKTOP, "light"],
    [DESKTOP, "dark"],
    [PHONE, "light"],
] as const) {
    await step(`VM-29 ${vp.width} ${theme}`, async () => {
        const chef = await newPage(browser, vp, theme, "chef");
        const api = (path: string) => `${BASE}/api/orders/${SLUG}${path}`;
        if (!VM29.ready) {
            VM29.ready = true;
            // start from an empty board: serve what's there (this lane's demo data only)
            const next: Record<string, string> = { pending: "preparing", preparing: "ready", ready: "served" };
            for (const o of (await (await chef.page.request.get(api("/kitchen"))).json()) as { _id: string; status: string }[]) {
                for (let s = next[o.status]; s; s = next[s])
                    await chef.page.request.patch(api(`/kitchen/${o._id}/status`), { data: { status: s } });
            }
            const menu = dishesOf(await (await chef.page.request.get(`${BASE}/api/menu/${SLUG}/public/items`)).json());
            const ids: string[] = [];
            for (const [table, lines] of [
                ["T3", [{ item: { _id: menu[1]._id }, quantity: 2 }]],
                [
                    "T1",
                    [
                        { item: { _id: menu[0]._id }, quantity: 1 },
                        { item: { _id: menu[3]._id }, quantity: 2 },
                    ],
                ],
                ["T2", [{ item: { _id: menu[2]._id }, quantity: 1 }]],
            ] as const) {
                const res = await chef.page.request.post(api(""), { data: { table, orderedItems: lines } });
                ids.push(String((await res.json())._id));
            }
            await ageOrders({ [ids[0]]: 20, [ids[1]]: 7 });
        }
        await chef.page.goto(`${BASE}/${SLUG}/kitchen`);
        await settle(chef.page);
        await shot({ page: chef.page, theme, width: vp.width }, "VM-29-kitchen-board");
        const kiosk = chef.page.getByRole("button", { name: "Kiosk mode" });
        if (theme === "light" && (await kiosk.count())) {
            await chef.page.getByRole("button", { name: "Start service" }).click();
            await kiosk.click();
            await settle(chef.page);
            await shot({ page: chef.page, theme, width: vp.width }, "VM-29-kiosk", false);
        }
        await chef.context.close();
    });
}

// VM-30: the customer's "Request bill" and "Call staff" buttons, and the badge on the cashier's card.
const VM30 = { ready: false, asked: false };
for (const [vp, theme] of [
    [DESKTOP, "light"],
    [DESKTOP, "dark"],
    [PHONE, "light"],
] as const) {
    await step(`VM-30 ${vp.width} ${theme}`, async () => {
        const cashier = await newPage(browser, vp, theme, "cashier");
        const api = (path: string) => `${BASE}/api/orders/${SLUG}${path}`;
        if (!VM30.ready) {
            VM30.ready = true;
            const open = (await (await cashier.page.request.get(api("/bills?status=open"))).json()) as { _id: string; table: string }[];
            for (const b of open.filter((b) => b.table === "T4")) await cashier.page.request.patch(api(`/bills/${b._id}`), { data: { isPaid: true } });
            const menu = dishesOf(await (await cashier.page.request.get(`${BASE}/api/menu/${SLUG}/public/items`)).json());
            await cashier.page.request.post(api(""), { data: { table: "T4", orderedItems: [{ item: { _id: menu[0]._id }, quantity: 2 }] } });
        }

        const customer = await newPage(browser, vp, theme);
        await customer.page.goto(`${BASE}/${SLUG}/customer/T4`);
        await settle(customer.page);
        const requestBill = customer.page.getByRole("button", { name: "Request bill" });
        if (!VM30.asked && (await requestBill.count())) {
            VM30.asked = true;
            await requestBill.click();
            await customer.page.getByText(/We've told the staff/).waitFor({ timeout: 10_000 });
            await customer.page.getByRole("button", { name: "Call staff" }).click();
            await settle(customer.page);
        }
        await shot({ page: customer.page, theme, width: vp.width }, "VM-30-customer-menu", false);
        await customer.context.close();

        await cashier.context.addInitScript(() => localStorage.setItem("dashboardSection", "orders"));
        await cashier.page.goto(`${BASE}/${SLUG}/cashier/dashboard`);
        await settle(cashier.page);
        const card = cashier.page.locator("article").filter({ has: cashier.page.getByRole("heading", { name: "Table T4" }) });
        await card.scrollIntoViewIfNeeded();
        await settle(cashier.page);
        await shot({ page: cashier.page, theme, width: vp.width }, "VM-30-cashier-card", false);
        await cashier.context.close();
    });
}

await browser.close();
// A partial run (ONLY) adds to the log instead of replacing the full run's log.
if (ONLY) appendFileSync(join(OUT, "capture-log.txt"), `# ONLY=${ONLY.source} (${new Date().toISOString()})\n${results.join("\n")}\n`);
else writeFileSync(join(OUT, "capture-log.txt"), results.join("\n") + "\n");
console.log(results.join("\n"));
