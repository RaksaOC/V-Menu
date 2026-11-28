import { expect, test, type Page } from "@playwright/test";
import { SLUG, signInAs } from "./support/auth";
import { withoutDishes } from "./support/menu";
import { ownTable } from "./support/tables";

// B4: what the customer sees when something is wrong. The table page explains why it can't show
// the menu (VM-04), a sold-out dish can't be added (VM-26), and each ordering error shows the
// right text and keeps the cart (VM-06). Ordering errors mock the order API with page.route, so
// no table or dish has to be broken for real.

test.describe("the table page", () => {
    test("a closed table says so and asks for a staff member", async ({ page, baseURL }) => {
        const table = await ownTable(baseURL!, "Closed", { open: false }); // a new table starts closed
        try {
            await page.goto(`/${SLUG}/customer/${table.name}`);
            await expect(page.getByRole("heading", { name: `Table ${table.name} isn't open yet` })).toBeVisible();
            await expect(page.getByText(/ask a staff member to open it/i)).toBeVisible();
            await expect(page).toHaveURL(new RegExp(`/${SLUG}/customer/${table.name}$`)); // no redirect
            await expect(page.getByText(/scan the QR code/i)).toHaveCount(0);
        } finally {
            await table.remove();
        }
    });

    test("an unknown restaurant says so", async ({ page }) => {
        await page.goto("/no-such-restaurant/customer/T1");
        await expect(page.getByRole("heading", { name: "We couldn't find this restaurant" })).toBeVisible();
    });

    test("a 503 offers Try again, which loads the menu", async ({ page }) => {
        let failed = false;
        await page.route(`**/api/menu/${SLUG}/public/tables/**`, async (route) => {
            if (failed) return route.continue();
            failed = true;
            await route.fulfill({ status: 503, json: { message: "We're having trouble right now. Please try again in a moment." } });
        });
        await page.goto(`/${SLUG}/customer/T1`);
        await expect(page.getByRole("heading", { name: "Something went wrong" })).toBeVisible();
        await page.getByRole("button", { name: "Try again" }).click();
        await expect(page.getByRole("heading", { name: "Our Menu" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Add to Cart" }).first()).toBeVisible();
    });

    // Uses its own dish, so other specs aren't affected.
    test("a sold-out dish shows the label, has no Add button, and can't be ordered", async ({ page, browser, baseURL }) => {
        const owner = await browser.newContext({ baseURL });
        await signInAs(owner, baseURL!, "owner");
        const name = `Test Soup ${Date.now()}`;
        const created = await owner.request.post(`/api/menu/${SLUG}/items`, {
            data: { name, priceCents: 200, image: "/images/img.png", description: "A very good soup", tags: ["spicy"], isEnabled: false },
        });
        expect(created.status()).toBe(201);
        const dish = (await created.json()) as { _id: string };
        try {
            await page.goto(`/${SLUG}/customer/T1`);
            const card = page.locator("article").filter({ has: page.getByRole("heading", { name }) });
            await expect(card.getByText("SOLD OUT", { exact: true })).toBeVisible();
            await expect(card.getByText("A very good soup")).toBeVisible();
            await expect(card.getByText("spicy")).toBeVisible();
            await expect(card.getByRole("button")).toHaveCount(0);

            const order = await page.request.post(`/api/orders/${SLUG}`, {
                data: { table: "T1", orderedItems: [{ item: { _id: dish._id }, quantity: 1 }] },
            });
            expect(order.status()).toBe(409);
        } finally {
            await owner.request.delete(`/api/menu/${SLUG}/items/${dish._id}`);
            await owner.close();
        }
    });
});

test.describe("placing an order", () => {
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

    for (const [status, body] of [
        [409, { message: "Table is not available", code: "TABLE_CLOSED" }],
        [503, { message: "We're having trouble right now. Please try again in a moment." }],
        // VM-22: too many orders from one phone or one table
        [429, { message: "You're ordering very quickly. Please wait a minute and try again.", code: "TOO_MANY_ORDERS" }],
    ] as const) {
        test(`${status} ${body.message}: shows it and keeps the cart`, async ({ page }) => {
            await fillCart(page);
            await page.route(`**/api/orders/${SLUG}`, (route) => route.fulfill({ status, json: body }));
            await page.getByRole("button", { name: /place order/i }).click();
            await expect(alertBox(page)).toContainText(body.message);
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
            await route.fulfill({ json: withoutDishes(menu, (dish) => dish.name !== goneName) });
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
                return route.fulfill({ status: 503, json: { message: "We're having trouble right now. Please try again in a moment." } });
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
});
