import { expect, test } from "@playwright/test";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { SLUG, signInAs } from "./support/auth";

// SEC-04: a table's QR code opens its own link token. Resetting it replaces the link.
test("the QR code holds the token form; it opens the menu, and a reset replaces it", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, "owner");
    const name = `qr-${Date.now()}`;
    const created = await page.request.post(`/api/menu/${SLUG}/tables`, { data: { type: "manual", name } });
    expect(created.status()).toBe(201);
    const table = (await created.json()) as { _id: string; qrToken: string };
    try {
        await page.request.patch(`/api/menu/${SLUG}/tables/${table._id}/availability`, { data: { isEnabled: true } });
        await page.goto("/owner");
        await page
            .getByRole("button", { name: /^\s*Tables\s*$/i })
            .first()
            .click();
        const card = page
            .locator("div")
            .filter({ has: page.getByRole("heading", { name: `Table ${name}`, exact: true }) })
            .last();
        await card.getByRole("button", { name: "View QR Code" }).click();
        const img = page.getByRole("dialog").getByRole("img", { name: `QR code for table ${name}` });
        await expect(img).toBeVisible();
        const png = PNG.sync.read(Buffer.from((await img.getAttribute("src"))!.split(",")[1], "base64"));
        const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
        expect(code?.data).toBe(new URL(`/${SLUG}/t/${table.qrToken}`, baseURL).href);

        await page.goto(code!.data);
        await expect(page.getByText(`Table ${name}`)).toBeVisible();
        await expect(page.getByRole("heading", { name: "Our Menu" })).toBeVisible();

        const reset = await page.request.post(`/api/menu/${SLUG}/tables/${table._id}/qr-token`);
        expect(reset.status()).toBe(200);
        await page.goto(code!.data);
        await expect(page.getByRole("heading", { name: "This table link isn't valid" })).toBeVisible();
    } finally {
        await page.request.delete(`/api/menu/${SLUG}/tables/${table._id}`);
    }
});

test("a customer orders through the link, and the confirmation stays on it", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, "cashier");
    const tables = (await (await page.request.get(`/api/menu/${SLUG}/tables`)).json()) as { name: string; qrToken: string }[];
    const t1 = tables.find((t) => t.name === "T1")!;
    await context.clearCookies();
    await page.goto(`/${SLUG}/t/${t1.qrToken}`);
    await page.getByRole("button", { name: "Add to Cart" }).first().click();
    await page.getByRole("button", { name: "View Cart" }).click();
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/t/${t1.qrToken}/cart$`));
    const placed = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith(`/api/orders/${SLUG}`));
    await page.getByRole("button", { name: "Place Order" }).click();
    const body = (await placed).postDataJSON() as Record<string, unknown>;
    expect(body.qrToken).toBe(t1.qrToken);
    expect(body).not.toHaveProperty("table");
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/t/${t1.qrToken}/orders/[a-f0-9]{24}$`));
    await expect(page.getByRole("heading", { name: /sent to the kitchen/ })).toBeVisible();
});
