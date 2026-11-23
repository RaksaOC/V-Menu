import { expect, test } from "@playwright/test";
import { SLUG, signInAs } from "./support/auth";

// VM-03: when the kitchen's sign-in ends, the screen goes to the login page and says why,
// instead of silently showing old orders.
test("an ended kitchen session goes to the login page with a message", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, "chef");
    await page.goto(`/${SLUG}/kitchen`);
    await expect(page.getByRole("heading", { name: /kitchen/i }).first()).toBeVisible();

    // the session ends: the cookie is gone and the stored token is no longer valid
    await context.clearCookies();
    await page.evaluate(() => localStorage.setItem("token", "ended.session.token"));

    // the next poll (every 2 s) gets 401
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/kitchen/login\\?expired=1$`), { timeout: 10_000 });
    await expect(page.getByRole("status")).toHaveText("Your session ended, please sign in again.");
});
