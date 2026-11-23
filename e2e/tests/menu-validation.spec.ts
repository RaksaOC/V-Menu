import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";

// VM-17: in a real browser, the item popup shows our message next to the field. The browser's own
// number checks must not stop the form first with a bubble that goes away.
test("a bad price and an empty name are explained next to their fields, and nothing is sent", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, "owner");
    const writes: string[] = [];
    page.on("request", (r) => {
        if (r.method() !== "GET" && r.url().includes("/items")) writes.push(r.url());
    });
    await page.goto("/owner");
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page.getByRole("button", { name: "Add Item" }).click();
    const dialog = page.getByRole("dialog");
    const price = dialog.getByLabel("Price ($)");

    await price.fill("-1");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(price).toHaveAccessibleDescription("Must be 0 or more");
    await expect(dialog.getByLabel("Item Name")).toHaveAccessibleDescription("Required");

    await dialog.getByLabel("Item Name").fill("Soup");
    await price.fill("2.555");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(price).toHaveAccessibleDescription("At most 2 decimal places");
    expect(writes).toEqual([]);
});
