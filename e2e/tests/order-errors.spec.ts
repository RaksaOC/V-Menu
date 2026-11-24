import { expect, test, type Page } from "@playwright/test";
import { SLUG } from "./support/auth";

// VM-06: each ordering error shows the right text, and the cart is kept. The order API is mocked
// with page.route, so no table or dish has to be broken for real.
const CART = `/${SLUG}/customer/T1/cart`;

async function fillCart(page: Page) {
    await page.goto(`/${SLUG}/customer/T1`);
    await page.getByRole("button", { name: /add/i }).first().click();
    await page.getByRole("button", { name: /add/i }).nth(1).click();
    await page.goto(CART);
    await expect(page.getByRole("button", { name: /place order/i })).toBeEnabled();
}
// Next adds its own (empty) role="alert" route announcer; this is the cart's message.
const alertBox = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)');
const cartLines = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "[]").length, `cart:${SLUG}:T1`);

for (const [status, body, text] of [
    [409, { message: "Table is not available", code: "TABLE_CLOSED" }, "Table is not available"],
    [503, { message: "A required service is unavailable" }, "A required service is unavailable"],
] as const) {
    test(`${status} ${body.message}: shows it and keeps the cart`, async ({ page }) => {
        await fillCart(page);
        await page.route(`**/api/orders/${SLUG}`, (route) => route.fulfill({ status, json: body }));
        await page.getByRole("button", { name: /place order/i }).click();
        await expect(alertBox(page)).toContainText(text);
        expect(await cartLines(page)).toBe(2);
        await expect(page).toHaveURL(new RegExp(`${CART}$`));
    });
}

test("dishes no longer available are taken out of the cart, the rest is kept", async ({ page }) => {
    await fillCart(page);
    const lines = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), `cart:${SLUG}:T1`);
    const goneName: string = lines[1].item.name;
    await page.route(`**/api/orders/${SLUG}`, (route) =>
        route.fulfill({ status: 409, json: { message: "Some items are no longer available", code: "ITEMS_UNAVAILABLE" } }),
    );
    await page.route(`**/api/menu/${SLUG}/public/items`, async (route) => {
        const menu = await (await route.fetch()).json();
        await route.fulfill({ json: menu.filter((i: { name: string }) => i.name !== goneName) });
    });
    await page.getByRole("button", { name: /place order/i }).click();
    await expect(alertBox(page)).toContainText("Some items are no longer available");
    await expect(alertBox(page)).toContainText(goneName);
    expect(await cartLines(page)).toBe(1);
});

test("Try again after a 503 places the order", async ({ page }) => {
    await fillCart(page);
    let first = true;
    await page.route(`**/api/orders/${SLUG}`, async (route) => {
        if (first) {
            first = false;
            return route.fulfill({ status: 503, json: { message: "A required service is unavailable" } });
        }
        return route.continue();
    });
    await page.getByRole("button", { name: /place order/i }).click();
    await page
        .getByRole("alert")
        .getByRole("button", { name: /try again/i })
        .click();
    await expect(page.getByRole("heading", { name: /sent to the kitchen/ })).toBeVisible(); // VM-07
});
