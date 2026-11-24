import { expect, test } from "@playwright/test";
import { signInAs, SLUG } from "./support/auth";
import { dishesOf } from "./support/menu";

// VM-27: an order goes from New to Ready on the kitchen screen, and the customer's page says Ready.
const TABLE = process.env.STATUS_TABLE ?? "T3";

test("the kitchen moves an order from New to Ready, and the customer sees Ready", async ({ page, context, baseURL }) => {
    const [dish] = dishesOf(await (await page.request.get(`/api/menu/${SLUG}/public/items`)).json());
    const placed = await page.request.post(`/api/orders/${SLUG}`, {
        data: { table: TABLE, orderedItems: [{ item: { _id: dish._id }, quantity: 1 }] },
    });
    expect(placed.status()).toBe(201);
    const { _id } = (await placed.json()) as { _id: string };
    const number = _id.slice(-6).toUpperCase();

    await signInAs(context, baseURL!, "chef");
    await page.goto(`/${SLUG}/kitchen`);
    const card = (column: string) =>
        page
            .getByRole("region", { name: column })
            .locator("article")
            .filter({ hasText: `#${number}` });
    await expect(card("New")).toBeVisible();
    await card("New").getByRole("button", { name: "Start preparing" }).click();
    await expect(card("Preparing")).toBeVisible();
    await card("Preparing").getByRole("button", { name: "Mark ready" }).click();
    await expect(card("Ready")).toBeVisible();

    await page.goto(`/${SLUG}/customer/${TABLE}/orders/${_id}`);
    await expect(page.getByRole("status", { name: "Order status" })).toContainText("Ready");
});
