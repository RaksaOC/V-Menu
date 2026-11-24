import { expect, test } from "@playwright/test";

// VM-25: on a phone, the customer taps "Drinks" and the drinks are on screen.
// Uses the seeded demo restaurant (menu-service seed: Mains and Drinks).
const SLUG = process.env.SLUG ?? "demo-bistro";
test.use({ viewport: { width: 360, height: 740 } });

test("customer taps Drinks and the drinks section is in view", async ({ page }) => {
    await page.goto(`/${SLUG}/customer/T1`);
    const drinks = page.getByRole("region", { name: "Drinks" });
    await expect(drinks).toBeAttached();
    await expect(drinks.getByRole("heading", { name: "Drinks" })).not.toBeInViewport(); // below the mains on a phone

    await page.getByRole("navigation", { name: "Menu categories" }).getByRole("button", { name: "Drinks" }).click();
    await expect(drinks.getByRole("heading", { name: "Drinks" })).toBeInViewport();
    await expect(drinks.getByText("Iced Coffee")).toBeInViewport();
});

test("the search box narrows the menu to matching dishes", async ({ page }) => {
    await page.goto(`/${SLUG}/customer/T1`);
    await page.getByRole("searchbox", { name: "Search dishes" }).fill("amok");
    await expect(page.getByText("Fish Amok")).toBeVisible();
    await expect(page.getByText("Iced Coffee")).toHaveCount(0);
});
