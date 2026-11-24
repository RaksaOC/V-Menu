import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { SLUG, signInAs } from "./support/auth";

// SEC-02: the pages send the security headers: the landing page, a customer page and staff pages.
const PAGES = ["/", `/${SLUG}/customer/T1`, `/${SLUG}/cashier/login`, "/owner/login"];

for (const path of PAGES) {
    test(`security headers on ${path}`, async ({ request }) => {
        const res = await request.get(path);
        expect(res.status()).toBeLessThan(400);
        const h = res.headers();
        expect(h["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains");
        expect(h["x-content-type-options"]).toBe("nosniff");
        expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
        expect(h["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");
        expect(h["x-frame-options"]).toBe("DENY");
        const csp = h["content-security-policy"] ?? h["content-security-policy-report-only"];
        expect(csp).toContain("frame-ancestors 'none'");
        expect(h["x-powered-by"]).toBeUndefined();
    });
}

// The policy may start in report-only mode, so nothing would visibly break: listen for the
// browser's violation events instead. Any violation here would break the page once enforced.
async function watchPolicy(page: Page) {
    await page.addInitScript(() => {
        (window as unknown as { __csp: string[] }).__csp = [];
        document.addEventListener("securitypolicyviolation", (e) =>
            (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`),
        );
    });
    return () => page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
}

test("customer pages run under the policy with no violations", async ({ page }) => {
    const violations = await watchPolicy(page);
    await page.goto(`/${SLUG}/customer/T1`);
    await expect(page.getByText("Fried Rice")).toBeVisible();
    await expect(page.locator("img[alt='Fried Rice']").first()).toHaveJSProperty("complete", true);
    expect(await violations()).toEqual([]);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(await violations()).toEqual([]);
});

test("staff screens run under the policy with no violations, QR codes and printing included", async ({ page, context, baseURL }) => {
    const violations = await watchPolicy(page);
    await signInAs(context, baseURL!, "owner");
    await page.goto("/owner");
    await page
        .getByRole("button", { name: /^\s*Tables\s*$/i })
        .first()
        .click();
    await page
        .getByRole("button", { name: /view qr code/i })
        .first()
        .click();
    await expect(page.getByRole("img", { name: /QR code for table/ })).toBeVisible();
    await page.keyboard.press("Escape");
    // printing renders the sheet in a frame first; stop before the print dialog opens
    await page.evaluate(() => (window.print = () => {}));
    await page.getByRole("button", { name: /print all qr codes/i }).click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await expect(page.getByText("Fish Amok")).toBeVisible();
    expect(await violations()).toEqual([]);

    await signInAs(context, baseURL!, "cashier");
    await page.goto(`/${SLUG}/cashier/dashboard`);
    await page.waitForLoadState("networkidle");
    expect(await violations()).toEqual([]);

    await signInAs(context, baseURL!, "chef");
    await page.goto(`/${SLUG}/kitchen`);
    await page.waitForLoadState("networkidle");
    expect(await violations()).toEqual([]);
});
