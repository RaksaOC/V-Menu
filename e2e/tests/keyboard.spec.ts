import { expect, test, type Page } from "@playwright/test";
import { SLUG } from "./support/auth";
import { ownTable, type OwnTable } from "./support/tables";

// VM-36: a guest orders with the keyboard alone: Tab to a dish, add it, open the order, place it.
// Every step is reached with Tab and pressed with Enter, and focus is always visible.

let table: OwnTable;
test.beforeAll(async ({ baseURL }) => {
    table = await ownTable(baseURL!, "Keys");
});
test.afterAll(async () => {
    await table.remove();
});

/** Press Tab until the focused element matches, like a keyboard user would (at most 60 times). */
async function tabTo(page: Page, name: RegExp) {
    for (let i = 0; i < 60; i++) {
        await page.keyboard.press("Tab");
        const focused = await page.evaluate(() => {
            const el = document.activeElement as HTMLElement | null;
            if (!el || el === document.body) return null;
            const label = el.getAttribute("aria-label") ?? el.textContent ?? "";
            const style = getComputedStyle(el);
            const visible = style.outlineStyle !== "none" || style.boxShadow !== "none";
            return { label: label.replace(/\s+/g, " ").trim(), visible };
        });
        if (focused && name.test(focused.label)) {
            expect(focused.visible, `focus on "${focused.label}" can be seen`).toBe(true);
            return;
        }
    }
    throw new Error(`Tab never reached ${name}`);
}

test("a guest orders with the keyboard alone", async ({ page }) => {
    await page.goto(`/${SLUG}/customer/${table.name}`);
    await expect(page.getByRole("heading", { name: "Our Menu" })).toBeVisible();
    // the dishes load after the heading
    await expect(page.getByRole("button", { name: /^Add to cart: / }).first()).toBeVisible();

    await tabTo(page, /^Add to cart: /);
    await page.keyboard.press("Enter");
    await tabTo(page, /view order/i);
    await page.keyboard.press("Enter");

    await expect(page.getByRole("heading", { name: /Your Cart/ })).toBeVisible();
    await tabTo(page, /^Place order/);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: /sent to the kitchen/ })).toBeVisible({ timeout: 15_000 });
});
