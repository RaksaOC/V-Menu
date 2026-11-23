import { expect, test } from "@playwright/test";
import { signInAs, SLUG } from "./support/auth";
import { dishesOf } from "./support/menu";

// VM-24: the cashier prints the invoice. The print shows only the invoice, with the restaurant's
// name and the right total. The test uses a table of its own, so other tests' orders don't mix in.
test("the print preview shows the restaurant's name and the bill's total", async ({ browser, page, context, baseURL }) => {
    const owner = await browser.newContext({ baseURL });
    await signInAs(owner, baseURL!, "owner");
    const name = `Print-${Date.now().toString(36)}`;
    const table = await owner.request.post(`/api/menu/${SLUG}/tables`, { data: { type: "manual", name } });
    expect(table.status()).toBe(201);
    const tableId = (await table.json())._id as string;
    // a new table starts closed
    expect((await owner.request.patch(`/api/menu/${SLUG}/tables/${tableId}/availability`, { data: { isEnabled: true } })).ok()).toBe(true);

    await signInAs(context, baseURL!, "cashier");
    try {
        const [dish] = dishesOf(await (await page.request.get(`/api/menu/${SLUG}/public/items`)).json());
        const placed = await page.request.post(`/api/orders/${SLUG}`, {
            data: { table: name, orderedItems: [{ item: dish, quantity: 3 }] },
        });
        expect(placed.status()).toBe(201);
        const total = `$${((dish.priceCents * 3) / 100).toFixed(2)}`;

        await context.addInitScript(() => localStorage.setItem("dashboardSection", "orders"));
        await page.goto(`/${SLUG}/cashier/dashboard`);
        const card = page.locator("article").filter({ has: page.getByRole("heading", { name: `Table ${name}` }) });
        await card.getByRole("button", { name: "View Invoice" }).click();
        await page.emulateMedia({ media: "print" });

        const invoice = page.locator("[data-print]");
        await expect(invoice.getByText("Demo Bistro")).toBeVisible();
        await expect(invoice.getByText(`Table ${name}`)).toBeVisible();
        await expect(invoice.locator("div", { hasText: /^Total/ }).last()).toContainText(total);
        await expect(page.getByText("Manage your restaurant operations")).toBeHidden(); // the dashboard isn't printed
    } finally {
        const open = (await (await page.request.get(`/api/orders/${SLUG}/bills?status=open`)).json()) as { _id: string; table: string }[];
        for (const b of open.filter((b) => b.table === name))
            await page.request.patch(`/api/orders/${SLUG}/bills/${b._id}`, { data: { isPaid: true } });
        await owner.request.delete(`/api/menu/${SLUG}/tables/${tableId}`);
        await owner.close();
    }
});
