import { expect, test, type APIRequestContext } from "@playwright/test";
import { SLUG, staffToken } from "./support/auth";

// B7: the short suite that runs against staging after every staging deploy (deploy.yml,
// post-deploy job: `npx playwright test --grep @post-deploy`). It also runs in the e2e job with
// the other specs, so a change that breaks it fails its PR first.
//
// A customer opens the demo table's menu and orders; the kitchen API sees the order. Then the
// cashier cancels it, so staging's kitchen queue doesn't fill up with test orders (and the
// "order pending too long" alert stays quiet). No sign-in: against staging the job passes
// short-lived CHEF_TOKEN and CASHIER_TOKEN; locally they're signed from the stack's secret.
const TABLE = process.env.TABLE ?? "T1";

interface Order {
    _id: string;
    table: string;
    status: string;
}

test("a customer orders at the demo table and the kitchen sees it", { tag: "@post-deploy" }, async ({ page, playwright, baseURL }) => {
    const as = async (role: "chef" | "cashier"): Promise<APIRequestContext> =>
        playwright.request.newContext({ baseURL, extraHTTPHeaders: { cookie: `token=${await staffToken(role)}` } });

    // the customer: menu -> cart -> order
    await page.goto(`/${SLUG}/customer/${TABLE}`);
    await expect(page.getByRole("heading", { name: "Our Menu" })).toBeVisible();
    await page.getByRole("button", { name: "Add to Cart" }).first().click();
    await expect(page.getByText("Added to cart!")).toBeVisible();
    await page.getByRole("link", { name: /view order/i }).click();
    const placed = page.waitForResponse((r) => r.url().endsWith(`/api/orders/${SLUG}`) && r.request().method() === "POST");
    await page.getByRole("button", { name: "Place Order" }).click();
    const response = await placed;
    expect(response.status(), "placing the order").toBe(201);
    const order = (await response.json()) as Order;
    await expect(page.getByRole("heading", { name: /sent to the kitchen/ })).toBeVisible();

    try {
        // the kitchen sees it, still pending, at the right table
        const chef = await as("chef");
        const kitchen = await chef.get(`/api/orders/${SLUG}/kitchen`);
        expect(kitchen.status(), "the chef's kitchen queue").toBe(200);
        const mine = ((await kitchen.json()) as Order[]).find((o) => o._id === order._id);
        expect(mine, `order ${order._id} in the kitchen queue`).toBeDefined();
        expect(mine).toMatchObject({ table: TABLE, status: "pending" });
        await chef.dispose();
    } finally {
        // clean up: the cashier cancels this order (only this one) on the table's open bill
        const cashier = await as("cashier");
        const bills = (await (await cashier.get(`/api/orders/${SLUG}/bills?status=open`)).json()) as { _id: string; orders: Order[] }[];
        const bill = bills.find((b) => b.orders.some((o) => o._id === order._id));
        expect(bill, "the order's open bill").toBeDefined();
        const cancelled = await cashier.patch(`/api/orders/${SLUG}/bills/${bill!._id}/orders/${order._id}/cancel`, {
            data: { reason: "Post-deploy check (B7)" },
        });
        expect(cancelled.status(), "cancelling the test order").toBe(200);
        expect(((await cancelled.json()) as Order).status).toBe("cancelled");
        await cashier.dispose();
    }
});
