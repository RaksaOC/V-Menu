import { expect, test } from "@playwright/test";
import { SLUG } from "./support/auth";

// VM-21: the customer sees "Demo Bistro", not the slug "demo-bistro".
test("the customer menu shows the restaurant's real name in the heading and the tab", async ({ page }) => {
    await page.goto(`/${SLUG}/customer/T1`);
    await expect(page.getByRole("heading", { level: 1, name: "Demo Bistro" })).toBeVisible();
    await expect(page).toHaveTitle("Demo Bistro · Table T1");
    await expect(page.getByRole("heading", { level: 1, name: SLUG })).toHaveCount(0);
});
