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
                for (let i = 0; i < 2; i++) await add.nth(i).click({ timeout: 5000 }).catch(() => {});
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
        await page.screenshot({ path: join(OUT, `CL-10-toast-added-to-cart-${PHONE.width}${theme === "dark" ? "-dark" : ""}.png`), animations: "disabled" });
        results.push(`ok   CL-10-toast-added-to-cart-${PHONE.width}${theme === "dark" ? "-dark" : ""}`);
        await context.close();
    });
}

// The customer error states (VM-04): closed table and unknown restaurant.
await step("customer errors", async () => {
    const { context, page } = await newPage(browser, PHONE, "light");
    const c = { page, theme: "light" as const, width: PHONE.width };
    await page.goto(`${BASE}/${SLUG}/customer/NO-SUCH-TABLE`);
    await settle(page);
    await shot(c, "VM-04-closed-table");
    await page.goto(`${BASE}/no-such-restaurant/customer/T1`);
    await settle(page);
    await shot(c, "VM-04-unknown-restaurant");
    await context.close();
});

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
for (const [vp, theme] of [[DESKTOP, "light"], [DESKTOP, "dark"], [PHONE, "light"]] as const) {
    await step(`VM-01 cashier ${vp.width} ${theme}`, async () => {
        const { context, page } = await newPage(browser, vp, theme, "cashier");
        await context.addInitScript(() => localStorage.setItem("dashboardSection", "tables"));
        await page.goto(`${BASE}/${SLUG}/cashier/dashboard`);
        await settle(page);
        await page.getByRole("button", { name: /view qr code/i }).first().click({ timeout: 5000 });
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
        await page.getByRole("button", { name: /^\s*Tables\s*$/i }).first().click({ timeout: 5000 });
        await settle(page);
        const c = { page, theme, width: DESKTOP.width };
        await shot(c, "VM-01-owner-tables", false);
        await page.getByRole("button", { name: /view qr code/i }).first().click({ timeout: 5000 });
        await page.waitForTimeout(800);
        await shot(c, "VM-01-owner-qr", false);
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
            await page.getByRole("button", { name: new RegExp(`^\\s*${tab}\\s*$`, "i") }).first().click({ timeout: 5000 });
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
                await page.getByRole("button", { name: /add (new )?item|add dish|new item/i }).first().click({ timeout: 5000 });
                await page.waitForTimeout(500);
                const dialog = page.locator("form, [role=dialog]").last();
                await dialog.locator("input[type=text], input:not([type])").first().fill("Showcase Dish");
                await dialog.locator("input[type=number]").first().fill("4.5");
                await dialog.locator("input[type=file]").first().setInputFiles(photo);
                const answer = page.waitForResponse((r) => r.url().includes("/items") && r.request().method() === "POST", { timeout: 10_000 });
                await dialog.getByRole("button", { name: /save|add|create/i }).last().click();
                const res = await answer.catch(() => null);
                const status = res ? `${res.status()} ${await res.text()}` : "no request";
                writeFileSync(join(OUT, "VM-02-add-item-response.txt"), `POST /items with fixture-photo.jpg (${statSync(photo).size} bytes) -> ${status}\n`);
                await page.waitForTimeout(800);
                await shot(c, "VM-02-add-item-with-photo", false);
            }
        }
        await context.close();
    });
}

await browser.close();
// A partial run (ONLY) adds to the log instead of replacing the full run's log.
if (ONLY) appendFileSync(join(OUT, "capture-log.txt"), `# ONLY=${ONLY.source} (${new Date().toISOString()})\n${results.join("\n")}\n`);
else writeFileSync(join(OUT, "capture-log.txt"), results.join("\n") + "\n");
console.log(results.join("\n"));
