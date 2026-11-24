import { expect, test } from "@playwright/test";
import { signInAs, SLUG } from "./support/auth";
import { dishesOf } from "./support/menu";
import { ownTable, type OwnTable } from "./support/tables";

// VM-11: the cashier is on Orders, a customer orders, and the bill appears without a reload.
// CL-14: on a table of its own. It used T2, where other specs order too, so their orders could
// show up first.
let table: OwnTable;
test.beforeEach(async ({ baseURL }) => {
    table = await ownTable(baseURL!, "Live");
});
test.afterEach(async () => {
    await table.remove();
});

test("a customer's new order shows up on the cashier's Orders within 15 s, marked NEW", async ({ page, context, baseURL }) => {
    const TABLE = table.name;
    await signInAs(context, baseURL!, "cashier");

    await context.addInitScript(() => localStorage.setItem("dashboardSection", "orders"));
    await page.goto(`/${SLUG}/cashier/dashboard`);
    await expect(page.getByText(/updated just now/i)).toBeVisible();
    const card = page.locator("article").filter({ has: page.getByRole("heading", { name: `Table ${TABLE}` }) });
    await expect(card).toHaveCount(0);

    // the customer orders from another device (no reload on the cashier's side)
    const [dish] = dishesOf(await (await page.request.get(`/api/menu/${SLUG}/public/items`)).json());
    const placed = await page.request.post(`/api/orders/${SLUG}`, {
        data: { table: TABLE, orderedItems: [{ item: dish, quantity: 1 }] },
    });
    expect(placed.status()).toBe(201);

    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.getByText("NEW")).toBeVisible();
});
