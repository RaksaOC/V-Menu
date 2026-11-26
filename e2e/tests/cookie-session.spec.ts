import { expect, test } from "@playwright/test";
import { SLUG, sessionCookie, signInAs } from "./support/auth";

// SEC-01: after signing in, page scripts can't see the session, and other sites can't use it.
test("after sign-in, localStorage has no token and document.cookie can't see it", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, "cashier");
    await page.goto(`/${SLUG}/cashier/dashboard`);
    await expect(page.getByRole("heading", { name: "Overview" }).first()).toBeVisible();
    // the dashboard loaded its data, so the cookie did the work
    await expect(page.getByText(/V-Menu Cashier/)).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
    expect(await page.evaluate(() => document.cookie)).not.toContain("vmenu_");
    expect((await context.cookies()).find((c) => c.name === sessionCookie("cashier", baseURL!))?.httpOnly).toBe(true);
});

test("a write from another site is refused, even with the cookie", async ({ request, context, baseURL }) => {
    await signInAs(context, baseURL!, "cashier");
    const cookie = (await context.cookies()).find((c) => c.name === sessionCookie("cashier", baseURL!))!;
    const res = await request.patch(`/api/menu/${SLUG}/tables/000000000000000000000000/availability`, {
        headers: { origin: "https://evil.example", cookie: `${cookie.name}=${cookie.value}` },
        data: { isEnabled: false },
    });
    expect(res.status()).toBe(403);
});

test("the same write from the site itself gets past the Origin check", async ({ request, context, baseURL }) => {
    await signInAs(context, baseURL!, "cashier");
    const cookie = (await context.cookies()).find((c) => c.name === sessionCookie("cashier", baseURL!))!;
    const res = await request.patch(`/api/menu/${SLUG}/tables/000000000000000000000000/availability`, {
        headers: { origin: new URL(baseURL!).origin, cookie: `${cookie.name}=${cookie.value}` },
        data: { isEnabled: false },
    });
    expect(res.status()).toBe(404); // reached the route: no such table
});
