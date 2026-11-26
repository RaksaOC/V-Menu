import { expect, test } from "@playwright/test";
import { SLUG, signInAs } from "./support/auth";

// VM-19: a kitchen can sign out, and staff pages belong to one restaurant.
test("signing out of the kitchen goes to the login page and ends the session", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, "chef");
    await page.goto(`/${SLUG}/kitchen`);
    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/kitchen/login$`), { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Kitchen Login" })).toBeVisible();
    await expect.poll(async () => (await context.cookies()).some((c) => /vmenu_chef$/.test(c.name))).toBe(false);

    await page.goto(`/${SLUG}/kitchen`); // the board is closed now
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/kitchen/login$`));
});

test("a cashier of one restaurant opening another's dashboard goes to that restaurant's login", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, "cashier");
    await page.goto("/another-restaurant/cashier/dashboard");
    await expect(page).toHaveURL(/\/another-restaurant\/cashier\/login$/);
    await expect(page.getByRole("heading", { name: "Cashier Login" })).toBeVisible();

    await page.goto(`/${SLUG}/cashier/dashboard`); // their own still opens
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/cashier/dashboard$`));
});

// SEC-12: an owner who also works the cashier screen keeps both sign-ins in one browser.
test("an owner who signs in to the cashier screen is still signed in as owner", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, "owner");
    await signInAs(context, baseURL!, "cashier");
    await page.goto(`/${SLUG}/cashier/dashboard`);
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/cashier/dashboard$`));
    await page.goto("/owner");
    await expect(page).toHaveURL(/\/owner$/);
    // the header's account button shows who /api/auth/me says is signed in: the owner session answered
    await expect(page.locator("header").getByRole("button").first()).toContainText("Demo Owner");
    await page.goto(`/${SLUG}/cashier/dashboard`); // and the cashier sign-in is still there too
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/cashier/dashboard$`));
    await expect(page.getByText(/V-Menu Cashier/)).toBeVisible();
});
