import { expect, test } from "@playwright/test";

// B4: the customer's journey, which needs no sign-in: the table's menu, a dish into the cart, a
// note for the kitchen (VM-28), the order, and the confirmation page with its status (VM-07,
// VM-27). Uses the seeded demo restaurant. Runs on a desktop and on a phone (the mobile project).
const SLUG = process.env.SLUG ?? "demo-bistro";
const TABLE = process.env.TABLE ?? "T1";

test("customer orders a dish with a note, and the confirmation shows its status", async ({ page }) => {
    await page.goto(`/${SLUG}/customer/${TABLE}`);
    await expect(page.getByRole("heading", { name: "Our Menu" })).toBeVisible();

    // add the first dish on the menu
    await page.getByRole("button", { name: "Add to Cart" }).first().click();
    await expect(page.getByText("Added to cart!")).toBeVisible();

    // cart -> place order -> confirmation
    await page.getByRole("button", { name: "View Cart" }).click();
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/customer/${TABLE}/cart$`));
    await expect(page.getByRole("heading", { name: "Your Cart" })).toBeVisible();
    const note = `no ice ${Date.now().toString(36)}`;
    await page.getByRole("textbox", { name: "Note for the kitchen" }).fill(note);

    const placed = page.waitForResponse((r) => r.url().includes(`/api/orders/${SLUG}`) && r.request().method() === "POST");
    await page.getByRole("button", { name: "Place Order" }).click();
    const response = await placed;
    expect(response.status()).toBe(201);
    const order = (await response.json()) as { _id: string; note?: string };
    expect(order.note).toBe(note);

    // VM-07: the confirmation page, with the order number and the server's total
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/customer/${TABLE}/orders/${order._id}$`));
    const number = order._id.slice(-6).toUpperCase();
    await expect(page.getByRole("heading", { name: `Order #${number} sent to the kitchen` })).toBeVisible();
    await expect(page.getByRole("status", { name: "Order status" })).toContainText("Waiting for the kitchen");
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
