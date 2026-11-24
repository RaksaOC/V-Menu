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
    const response = await placed;
    expect(response.status()).toBe(201);
    const order = (await response.json()) as { _id: string };

    // VM-07: the confirmation page, with the order number and the server's total
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/customer/${TABLE}/orders/${order._id}$`));
    const number = order._id.slice(-6).toUpperCase();
    await expect(page.getByRole("heading", { name: `Order #${number} sent to the kitchen` })).toBeVisible();
    await expect(
        page
            .getByRole("region", { name: /this order/i })
            .getByText(/^\$\d+\.\d{2}$/)
            .last(),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: /your orders at this table/i }).getByText(`#${number}`)).toBeVisible();
    await page.getByRole("link", { name: /order more/i }).click();
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/customer/${TABLE}$`));
});
