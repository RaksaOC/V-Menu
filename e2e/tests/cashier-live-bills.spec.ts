import { expect, test } from "@playwright/test";
import { signInAs, SLUG } from "./support/auth";
import { dishesOf } from "./support/menu";

// VM-11: the cashier is on Orders, a customer orders, and the bill appears without a reload.
const TABLE = process.env.LIVE_TABLE ?? "T2";

test("a customer's new order shows up on the cashier's Orders within 15 s, marked NEW", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, "cashier");
    // start with the table settled, so this visit opens a new bill
    const open = (await (await page.request.get(`/api/orders/${SLUG}/bills?status=open`)).json()) as { _id: string; table: string }[];
    for (const b of open.filter((b) => b.table === TABLE))
        await page.request.patch(`/api/orders/${SLUG}/bills/${b._id}`, { data: { isPaid: true } });

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
