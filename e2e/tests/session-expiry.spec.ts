import { expect, test } from "@playwright/test";
import { SLUG, signInAs } from "./support/auth";

// VM-03: when the kitchen's sign-in ends, the screen goes to the login page and says why,
// instead of silently showing old orders.
test("an ended kitchen session goes to the login page with a message", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, "chef");
    await page.goto(`/${SLUG}/kitchen`);
    await expect(page.getByRole("heading", { name: /kitchen/i }).first()).toBeVisible();

    // the session ends: the cookie is gone (SEC-01: it's the only copy of the session)
    await context.clearCookies();

    // the next poll (every 5 s since VM-10) gets 401, then the login page loads. CL-14: 10 s was
    // too tight when the machine is busy (a 5 s wait for the poll, then the page).
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/kitchen/login\\?expired=1$`), { timeout: 20_000 });
    await expect(page.getByRole("status")).toHaveText("Your session ended, please sign in again.");
});
