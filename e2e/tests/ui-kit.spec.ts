import { expect, test } from "@playwright/test";

// CL-09: the UI kit page, in light and dark. Each run attaches a full-page screenshot of both
// themes to the report, and checks the parts that a screenshot can't (keyboard, focus).
for (const theme of ["light", "dark"] as const) {
    test(`UI kit in ${theme}`, async ({ page }, testInfo) => {
        await page.emulateMedia({ colorScheme: theme });
        await page.addInitScript((t) => localStorage.setItem("vm-theme", t), theme);
        await page.goto("/ui-kit");
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        for (const name of ["Button", "Chip", "Card and Input", "Skeleton", "Connection bar"]) {
            await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
        }
        await expect(page.getByRole("button", { name: "Loading" })).toBeDisabled();
        await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");

        // the page background follows the theme
        const bg = await page.locator("main").evaluate((el) => getComputedStyle(el).backgroundColor);
        expect(bg).not.toBe(theme === "dark" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)");

        await testInfo.attach(`ui-kit-${theme}.png`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });

        // the modal: focus inside, Tab stays inside, Escape closes and returns focus
        const opener = page.getByRole("button", { name: "Open modal" });
        await opener.click();
        const dialog = page.getByRole("dialog", { name: "Edit Table T1" });
        await expect(dialog).toBeVisible();
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press("Tab");
            expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
        }
        await testInfo.attach(`ui-kit-modal-${theme}.png`, { body: await page.screenshot(), contentType: "image/png" });
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await expect(opener).toBeFocused();
    });
}
