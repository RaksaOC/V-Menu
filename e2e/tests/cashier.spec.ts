import { expect, test } from "@playwright/test";
import { signInAs, SLUG } from "./support/auth";
import { dishesOf } from "./support/menu";
import { ownTable, type OwnTable } from "./support/tables";

// B4: the cashier's journey. The cashier opens a table, a customer orders, the bill appears
// without a reload, marked NEW (VM-11), the cashier prints the invoice (VM-24) and marks it paid.
// CL-14: on a table of its own, which starts closed, so other specs' orders don't mix in.
let table: OwnTable;
test.beforeEach(async ({ baseURL }) => {
    table = await ownTable(baseURL!, "Cashier", { open: false });
});
test.afterEach(async () => {
    await table.remove();
});

test("open a table, the bill appears without a reload, print the invoice, mark it paid", async ({ page, context, baseURL }) => {
    const TABLE = table.name;
    // count print requests instead of opening the browser's print dialog
    await context.addInitScript(() => {
        const w = window as unknown as { __prints: number; print: () => void };
        w.__prints = 0;
        w.print = () => void (w.__prints += 1);
    });
    await signInAs(context, baseURL!, "cashier");
    await page.addInitScript(() => {
        if (!sessionStorage.getItem("started")) localStorage.setItem("dashboardSection", "tables");
        sessionStorage.setItem("started", "1");
    });
    await page.goto(`/${SLUG}/cashier/dashboard`);

    // open the table
    const tableCard = page
        .locator("div")
        .filter({ has: page.getByRole("heading", { name: `Table ${TABLE}`, exact: true }) })
        .last();
    await expect(tableCard.getByText("Closed")).toBeVisible();
    // a click while the list is still being loaded can be lost, so click again until it's open
    const openButton = tableCard.getByRole("button", { name: "Open Table" });
    await expect(async () => {
        if (await openButton.isVisible()) await openButton.click();
        await expect(tableCard.getByText("Available")).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 20_000 });

    // to Orders, where the table has no bill yet
    await page
        .getByRole("button", { name: /^Orders/ })
        .filter({ visible: true })
        .first()
        .click();
    await expect(page.getByText(/updated just now/i)).toBeVisible();
    const bill = page.locator("article").filter({ has: page.getByRole("heading", { name: `Table ${TABLE}` }) });
    await expect(bill).toHaveCount(0);

    // the customer orders from another device (no reload on the cashier's side)
    const [dish] = dishesOf(await (await page.request.get(`/api/menu/${SLUG}/public/items`)).json());
    const placed = await page.request.post(`/api/orders/${SLUG}`, {
        data: { table: TABLE, orderedItems: [{ item: dish, quantity: 3 }] },
    });
    expect(placed.status()).toBe(201);
    await expect(bill).toBeVisible({ timeout: 15_000 });
    await expect(bill.getByText("NEW")).toBeVisible();

    // the invoice: the restaurant's name, the table and the total
    const total = `$${((dish.priceCents * 3) / 100).toFixed(2)}`;
    await bill.getByRole("button", { name: "View Invoice" }).click();
    const invoice = page.locator("[data-print]");
    await expect(invoice.getByText("Demo Bistro")).toBeVisible();
    await expect(invoice.getByText(`Table ${TABLE}`)).toBeVisible();
    await expect(invoice.locator("div", { hasText: /^Total/ }).last()).toContainText(total);
    await page.getByRole("button", { name: "Print" }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __prints: number }).__prints)).toBe(1);
    await page.getByRole("dialog").getByRole("button", { name: "Close" }).last().click();

    // paid: the bill leaves the open ones
    await bill.getByRole("button", { name: "Mark as Paid" }).click();
    await expect(bill).toHaveCount(0);
    const open = (await (await page.request.get(`/api/orders/${SLUG}/bills?status=open`)).json()) as { table: string }[];
    expect(open.some((b) => b.table === TABLE)).toBe(false);
});
