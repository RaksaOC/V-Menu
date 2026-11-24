import { expect, test } from "@playwright/test";
import { SLUG } from "./support/auth";

// VM-32: /<slug> shows the real restaurant and the way in for staff; the template pages are gone.
test("the restaurant's page shows its real name and how to order", async ({ page }) => {
    await page.goto(`/${SLUG}`);
    await expect(page.getByRole("heading", { level: 1, name: "Demo Bistro" })).toBeVisible();
    await expect(page.getByText("Scan the QR code on your table to order")).toBeVisible();
    await expect(page.getByText("What Our Guests Say")).toHaveCount(0);
    await expect(page.getByText("Signature Dishes")).toHaveCount(0);
});

for (const [link, role] of [
    ["Cashier login", "cashier"],
    ["Kitchen login", "kitchen"],
] as const) {
    test(`${link} leads to the right login page`, async ({ page }) => {
        await page.goto(`/${SLUG}`);
        await page.getByRole("link", { name: link }).click();
        await expect(page).toHaveURL(new RegExp(`/${SLUG}/${role}/login$`));
    });
}

test("the old tenant page is gone", async ({ page }) => {
    const res = await page.goto(`/${SLUG}/tenant`);
    expect(res?.status()).toBe(404);
});

test("an unknown restaurant says so", async ({ page }) => {
    await page.goto("/no-such-restaurant-xyz");
    await expect(page.getByRole("heading", { name: "We couldn't find this restaurant" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cashier login" })).toHaveCount(0);
});
