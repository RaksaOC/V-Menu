import { expect, test } from "@playwright/test";
import { SLUG, signInAs } from "./support/auth";

// VM-26: a dish the cashier switched off stays on the customer's menu as SOLD OUT, with no Add
// button, and the order check refuses it. Uses its own dish, so other specs aren't affected.
test("a sold-out dish shows the label and has no Add button", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, "owner");
    const name = `Sold Out Soup ${Date.now()}`;
    const created = await page.request.post(`/api/menu/${SLUG}/items`, {
        data: { name, price: 2, image: "/images/img.png", description: "A very good soup", tags: ["spicy"], isEnabled: false },
    });
    expect(created.status()).toBe(201);
    const dish = (await created.json()) as { _id: string };
    try {
        await page.goto(`/${SLUG}/customer/T1`);
        const card = page.locator("article").filter({ has: page.getByRole("heading", { name }) });
        await expect(card.getByText("SOLD OUT")).toBeVisible();
        await expect(card.getByText("A very good soup")).toBeVisible();
        await expect(card.getByText("spicy")).toBeVisible();
        await expect(card.getByRole("button")).toHaveCount(0);

        const order = await page.request.post(`/api/orders/${SLUG}`, {
            data: { table: "T1", orderedItems: [{ item: { _id: dish._id }, quantity: 1 }] },
        });
        expect(order.status()).toBe(409);
    } finally {
        await page.request.delete(`/api/menu/${SLUG}/items/${dish._id}`);
    }
});
