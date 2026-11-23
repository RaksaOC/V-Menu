import { expect, request, test } from "@playwright/test";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { SLUG, signInAs, tokenFor } from "./support/auth";

// VM-01: a table whose name has a space gets a QR code that opens its menu, and its orders reach
// that table. Next hands the page "Patio%202"; it has to read it as "Patio 2".
const NAME = "Patio 2";

test("the QR code of a table named 'Patio 2' opens its menu and orders reach it", async ({ page, context, baseURL }) => {
    const owner = await request.newContext({ baseURL, extraHTTPHeaders: { authorization: `Bearer ${await tokenFor("owner")}` } });
    const created = await owner.post(`/api/menu/${SLUG}/tables`, { data: { type: "manual", name: NAME } });
    expect(created.status(), await created.text()).toBe(201);
    const { _id } = (await created.json()) as { _id: string };
    try {
        expect((await owner.patch(`/api/menu/${SLUG}/tables/${_id}/availability`, { data: { isEnabled: true } })).ok()).toBe(true);

        await signInAs(context, baseURL!, "cashier");
        await context.addInitScript(() => localStorage.setItem("dashboardSection", "tables"));
        await page.goto(`/${SLUG}/cashier/dashboard`);
        const card = page.getByRole("heading", { name: `Table ${NAME}` }).locator("xpath=..");
        await card.getByRole("button", { name: "View QR Code" }).click();

        const img = page.getByRole("dialog").getByRole("img", { name: `QR code for table ${NAME}` });
        await expect(img).toBeVisible();
        const png = PNG.sync.read(Buffer.from((await img.getAttribute("src"))!.split(",")[1], "base64"));
        const url = jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data;
        expect(url).toBe(new URL(`/${SLUG}/customer/Patio%202`, baseURL).href);

        // the scanned link opens this table's menu, under its real name
        await page.goto(url!);
        await expect(page.getByRole("heading", { name: "Our Menu" })).toBeVisible();
        await expect(page.getByText(`Table ${NAME}`, { exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Add to Cart" }).first().click();
        await expect(page.getByText("Added to cart!")).toBeVisible();

        // and the order is placed on "Patio 2"
        await page.getByRole("button", { name: "View Cart" }).click();
        await expect(page).toHaveURL(new RegExp(`/${SLUG}/customer/Patio%202/cart$`));
        const placed = page.waitForResponse((r) => r.url().endsWith(`/api/orders/${SLUG}`) && r.request().method() === "POST");
        await page.getByRole("button", { name: "Place Order" }).click();
        const order = await placed;
        expect(order.status(), await order.text()).toBe(201);
        expect((await order.json()).table).toBe(NAME);
    } finally {
        await owner.delete(`/api/menu/${SLUG}/tables/${_id}`);
        await owner.dispose();
    }
});
