import { expect, test } from "@playwright/test";

// The customer flow needs no sign-in: scan a table's QR code, pick a dish, place the order.
// Uses the seeded demo restaurant (restaurant-service and menu-service seeds).
const SLUG = process.env.SLUG ?? "demo-bistro";
const TABLE = process.env.TABLE ?? "T1";

test("customer orders a dish from a table page", async ({ page }) => {
    await page.goto(`/${SLUG}/customer/${TABLE}`);
    await expect(page.getByRole("heading", { name: "Our Menu" })).toBeVisible();

    // add the first dish on the menu
    await page.getByRole("button", { name: "Add to Cart" }).first().click();
    await expect(page.getByText("Added to cart!")).toBeVisible();

    // cart -> place order -> confirmation
    await page.getByRole("button", { name: "View Cart" }).click();
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/customer/${TABLE}/cart$`));
    await expect(page.getByRole("heading", { name: "Your Cart" })).toBeVisible();

    const placed = page.waitForResponse((r) => r.url().includes(`/api/orders/${SLUG}`) && r.request().method() === "POST");
    await page.getByRole("button", { name: "Place Order" }).click();
    expect((await placed).status()).toBe(201);
    await expect(page.getByText("Order placed successfully!")).toBeVisible();
});
