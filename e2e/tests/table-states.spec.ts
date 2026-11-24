import { expect, test } from "@playwright/test";
import { SLUG, signInAs } from "./support/auth";

// VM-04: the table page explains why it can't show the menu, instead of "scan the QR code".
test("a closed table says so and asks for a staff member", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, "cashier");
    const tables: { _id: string; name: string }[] = await (await page.request.get(`/api/menu/${SLUG}/tables`)).json();
    const t4 = tables.find((t) => t.name === "T4")!;
    const setOpen = (isEnabled: boolean) => page.request.patch(`/api/menu/${SLUG}/tables/${t4._id}/availability`, { data: { isEnabled } });
    expect((await setOpen(false)).ok()).toBe(true);
    try {
        await page.goto(`/${SLUG}/customer/T4`);
        await expect(page.getByRole("heading", { name: "Table T4 isn't open yet" })).toBeVisible();
        await expect(page.getByText(/ask a staff member to open it/i)).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`/${SLUG}/customer/T4$`)); // no redirect
        await expect(page.getByText(/scan the QR code/i)).toHaveCount(0);
    } finally {
        await setOpen(true); // leave the demo tables open
    }
});

test("an unknown restaurant says so", async ({ page }) => {
    await page.goto("/no-such-restaurant/customer/T1");
    await expect(page.getByRole("heading", { name: "We couldn't find this restaurant" })).toBeVisible();
});

test("a server error offers Try again, which loads the menu", async ({ page }) => {
    let failed = false;
    await page.route(`**/api/menu/${SLUG}/public/tables/**`, async (route) => {
        if (failed) return route.continue();
        failed = true;
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "A required service is unavailable" }) });
    });
    await page.goto(`/${SLUG}/customer/T1`);
    await expect(page.getByRole("heading", { name: "Something went wrong" })).toBeVisible();
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { name: "Our Menu" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add to Cart" }).first()).toBeVisible();
});
