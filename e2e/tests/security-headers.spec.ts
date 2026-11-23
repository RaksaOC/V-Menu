import { expect, test } from "@playwright/test";
import { SLUG } from "./support/auth";

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

test("the customer menu loads with no policy violations", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
        if (/Content.Security.Policy|Refused to/i.test(m.text())) violations.push(m.text());
    });
    await page.goto(`/${SLUG}/customer/T1`);
    await expect(page.getByText("Fried Rice")).toBeVisible();
    await expect(page.locator("img[alt='Fried Rice']").first()).toHaveJSProperty("complete", true);
    expect(violations).toEqual([]);
});
