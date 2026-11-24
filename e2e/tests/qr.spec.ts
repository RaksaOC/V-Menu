import { expect, test } from "@playwright/test";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { SLUG, signInAs } from "./support/auth";

// B4: the QR journey. VM-01: a table's QR code opens that table's menu.
test("the cashier's View QR Code shows a code that opens the table's menu", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, "cashier");
    await context.addInitScript(() => localStorage.setItem("dashboardSection", "tables"));
    await page.goto(`/${SLUG}/cashier/dashboard`);

    await page.getByRole("button", { name: "View QR Code" }).first().click();
    const dialog = page.getByRole("dialog");
    const img = dialog.getByRole("img", { name: /^QR code for table / });
    await expect(img).toBeVisible();
    const table = (await img.getAttribute("alt"))!.replace("QR code for table ", "");
    const tables = (await (await page.request.get(`/api/menu/${SLUG}/tables`)).json()) as { name: string; qrToken: string }[];
    const { qrToken } = tables.find((t) => t.name === table)!;

    // decode the PNG the modal shows, the same picture a phone camera would read
    const src = (await img.getAttribute("src"))!;
    const png = PNG.sync.read(Buffer.from(src.split(",")[1], "base64"));
    const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(code?.data).toBe(new URL(`/${SLUG}/t/${qrToken}`, baseURL).href); // SEC-04: the token form
    await expect(dialog.getByRole("link", { name: "Download PNG" })).toHaveAttribute("download", /-qr\.png$/);

    // scanning it opens the menu
    await page.goto(code!.data);
    await expect(page.getByRole("heading", { name: "Our Menu" })).toBeVisible();
    await expect(page.getByText(`Table ${table}`, { exact: true })).toBeVisible(); // that table's menu
});
