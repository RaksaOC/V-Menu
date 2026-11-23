import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { SLUG, signInAs } from "./support/auth";

// VM-01: the owner's QR modal shows the restaurant's name. Each run saves the "after" shots
// (owner 1280 light and dark, cashier 360), which CI uploads as the "vm-01-screenshots" artifact.
// Staff screens render light only for now (ThemeSync), so the dark shot shows the light page.
async function shot(page: Page, testInfo: TestInfo, name: string) {
    const path = testInfo.outputPath(name);
    await page.screenshot({ path });
    await testInfo.attach(name, { path, contentType: "image/png" });
}

for (const theme of ["light", "dark"] as const) {
    test(`the owner's QR modal names the restaurant (${theme})`, async ({ page, context, baseURL }, testInfo) => {
        await page.emulateMedia({ colorScheme: theme });
        await context.addInitScript((t) => localStorage.setItem("vm-theme", t), theme);
        await signInAs(context, baseURL!, "owner");
        await page.goto("/owner");
        await page.getByRole("button", { name: /^\s*Tables\s*$/ }).first().click();
        await expect(page.getByRole("button", { name: "Print all QR codes" })).toBeVisible();
        await shot(page, testInfo, `VM-01-owner-tables-1280${theme === "dark" ? "-dark" : ""}.png`);

        await page.getByRole("button", { name: "View QR Code" }).first().click();
        const dialog = page.getByRole("dialog");
        await expect(dialog.getByRole("img", { name: /^QR code for table / })).toBeVisible();
        await expect(dialog).toContainText("Demo Bistro");
        await expect(dialog.getByRole("link", { name: "Download PNG" })).toBeVisible();
        await shot(page, testInfo, `VM-01-owner-qr-1280${theme === "dark" ? "-dark" : ""}.png`);
    });
}

test("the cashier's QR modal at 360 px", async ({ page, context, baseURL }, testInfo) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await signInAs(context, baseURL!, "cashier");
    await context.addInitScript(() => localStorage.setItem("dashboardSection", "tables"));
    await page.goto(`/${SLUG}/cashier/dashboard`);
    await page.getByRole("button", { name: "View QR Code" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("img", { name: /^QR code for table / })).toBeVisible();
    // the modal's buttons fit on a phone and keep the 44 px target
    for (const control of [dialog.getByRole("link", { name: "Download PNG" }), dialog.getByRole("button", { name: "Print" })]) {
        const box = (await control.boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.x + box.width).toBeLessThanOrEqual(360);
    }
    await shot(page, testInfo, "VM-01-cashier-qr-360.png");
});
