import { expect, test } from "@playwright/test";
import { signInAs, SLUG } from "./support/auth";
import { dishesOf } from "./support/menu";
import { ownTable, type OwnTable } from "./support/tables";

// B4: the kitchen's journey. A new order appears on the screen without a reload, moves through
// the statuses (VM-27), the customer's page follows, and once served it is in the history (VM-10).
// On a table of its own, so other specs' orders don't mix in.
let table: OwnTable;
test.beforeEach(async ({ baseURL }) => {
    table = await ownTable(baseURL!, "Kitchen");
});
test.afterEach(async () => {
    await table.remove();
});

test("an order appears, moves New → Preparing → Ready → Served, and is in the history", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, "chef");
    await page.goto(`/${SLUG}/kitchen`);
    await expect(page.getByRole("region", { name: "New" })).toBeVisible();

    // the customer orders from their phone
    const [dish] = dishesOf(await (await page.request.get(`/api/menu/${SLUG}/public/items`)).json());
    const placed = await page.request.post(`/api/orders/${SLUG}`, {
        data: { table: table.name, orderedItems: [{ item: { _id: dish._id }, quantity: 1 }] },
    });
    expect(placed.status()).toBe(201);
    const { _id } = (await placed.json()) as { _id: string };
    const number = _id.slice(-6).toUpperCase();
    const card = (column: string) =>
        page
            .getByRole("region", { name: column })
            .locator("article")
            .filter({ hasText: `#${number}` });

    // it shows up on the next poll, with no reload
    await expect(card("New")).toBeVisible({ timeout: 15_000 });
    await card("New").getByRole("button", { name: "Start preparing" }).click();
    await expect(card("Preparing")).toBeVisible();
    await card("Preparing").getByRole("button", { name: "Mark ready" }).click();
    await expect(card("Ready")).toBeVisible();

    // the customer's page says Ready
    const customer = await context.newPage();
    await customer.goto(`/${SLUG}/customer/${table.name}/orders/${_id}`);
    await expect(customer.getByRole("status", { name: "Order status" })).toContainText("Ready");
    await customer.close();

    // served: off the board, into the history
    await card("Ready").getByRole("button", { name: "Mark served" }).click();
    await expect(page.locator("article").filter({ hasText: `#${number}` })).toHaveCount(0);
    await page.getByRole("link", { name: /View History/ }).click();
    await expect(page.getByRole("heading", { name: "Kitchen History" })).toBeVisible();
    await expect(page.locator("article").filter({ hasText: `#${number}` })).toBeVisible();
});
