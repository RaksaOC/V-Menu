import { expect, test } from "@playwright/test";
import { signInAs, SLUG } from "./support/auth";
import { dishesOf } from "./support/menu";

// VM-30: the customer requests the bill from the menu; the cashier's card shows the badge. The test
// uses a table of its own: each button works once per 2 minutes per bill. SEC-04: the customer is
// on the table's QR link, as in a restaurant, so the request goes by the link token.
test("the customer requests the bill and the cashier sees the badge", async ({ browser, page, baseURL }) => {
    const owner = await browser.newContext({ baseURL });
    await signInAs(owner, baseURL!, "owner");
    const name = `Req-${Date.now().toString(36)}`;
    const table = await owner.request.post(`/api/menu/${SLUG}/tables`, { data: { type: "manual", name } });
    expect(table.status()).toBe(201);
    const { _id: tableId, qrToken } = (await table.json()) as { _id: string; qrToken: string };
    expect((await owner.request.patch(`/api/menu/${SLUG}/tables/${tableId}/availability`, { data: { isEnabled: true } })).ok()).toBe(true);

    const cashier = await browser.newContext({ baseURL });
    await signInAs(cashier, baseURL!, "cashier");
    try {
        const [dish] = dishesOf(await (await page.request.get(`/api/menu/${SLUG}/public/items`)).json());
        expect(
            (
                await page.request.post(`/api/orders/${SLUG}`, {
                    data: { qrToken, orderedItems: [{ item: { _id: dish._id }, quantity: 1 }] },
                })
            ).status(),
        ).toBe(201);

        const asked = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith(`/t/${qrToken}/requests`));
        await page.goto(`/${SLUG}/t/${qrToken}`);
        const requestBill = page.getByRole("button", { name: "Request bill" });
        await expect(requestBill).toBeVisible({ timeout: 20_000 });
        await requestBill.click();
        await asked;
        await expect(page.getByText(/We've told the staff you'd like the bill/)).toBeVisible();

        const desk = await cashier.newPage();
        await desk.addInitScript(() => localStorage.setItem("dashboardSection", "orders"));
        await desk.goto(`/${SLUG}/cashier/dashboard`);
        const card = desk.locator("article").filter({ has: desk.getByRole("heading", { name: `Table ${name}` }) });
        await expect(card.getByText(/^BILL REQUESTED · /)).toBeVisible({ timeout: 15_000 });
        await card.getByRole("button", { name: "Dismiss bill request" }).click();
        await expect(card.getByText(/^BILL REQUESTED · /)).toHaveCount(0);
    } finally {
        const open = (await (await cashier.request.get(`/api/orders/${SLUG}/bills?status=open`)).json()) as {
            _id: string;
            table: string;
        }[];
        for (const b of open.filter((b) => b.table === name))
            await cashier.request.patch(`/api/orders/${SLUG}/bills/${b._id}`, { data: { isPaid: true } });
        await owner.request.delete(`/api/menu/${SLUG}/tables/${tableId}`);
        await owner.close();
        await cashier.close();
    }
});
