import { expect, test, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { SLUG, signInAs } from "./support/auth";
import * as firebase from "./support/firebase";

// VM-12: the owner invites staff by email; the person makes their own account at /login, and their
// invite is linked to it once the email is verified (VM-13). Against the Auth emulator (B6), like
// firebase-auth.spec.ts, whose comment says how to run these locally.
test.describe("staff invites, against the Auth emulator (VM-12)", () => {
    test.beforeAll(async ({ request }) => {
        const why = await firebase.emulatorProblem(request);
        if (why && process.env.CI) throw new Error(why);
        test.skip(Boolean(why), `${why}; see firebase-auth.spec.ts to run these`);
    });

    // never the real Firebase
    const blockGoogle = (context: BrowserContext) =>
        context.route(/^https:\/\/[a-z0-9-]+\.googleapis\.com\//, (route) => route.abort("blockedbyclient"));
    test.beforeEach(async ({ context }) => blockGoogle(context));

    /** The owner's staff screen for the demo restaurant. */
    async function staffScreen(page: Page) {
        await page.goto("/owner");
        await page.getByRole("button", { name: "Staff", exact: true }).click();
    }

    /** The invite, removed again so the demo data stays as it was. */
    async function removeInvite(request: APIRequestContext, email: string) {
        const list = (await (await request.get(`/api/restaurants/${SLUG}/staff`)).json()) as { _id: string; email: string }[];
        for (const m of list.filter((m) => m.email === email)) await request.delete(`/api/restaurants/${SLUG}/staff/${m._id}`);
    }

    test("the owner invites a cashier, who creates an account at /login, verifies it and reaches the cashier dashboard", async ({
        page,
        context,
        browser,
        baseURL,
    }) => {
        const email = firebase.testEmail("cashier");
        await signInAs(context, baseURL!, "owner");
        await staffScreen(page);
        await page.getByRole("button", { name: /add staff/i }).click();
        const dialog = page.getByRole("dialog");
        await dialog.getByLabel("Name").fill("Dara E2E");
        await dialog.getByLabel("Email").fill(email);
        await dialog.getByLabel("Role").selectOption("cashier");
        await expect(dialog.getByLabel(/password/i)).toHaveCount(0); // the owner never picks a password
        await dialog.getByRole("button", { name: "Send invite" }).click();
        await expect(page.locator("tr", { hasText: email }).getByText("Invite pending")).toBeVisible();

        // the cashier, in their own browser
        const theirs = await browser.newContext();
        try {
            await blockGoogle(theirs);
            const cashier = await theirs.newPage();
            await cashier.goto("/login");
            await cashier.getByRole("button", { name: /create an account/i }).click();
            await cashier.getByLabel("Email Address").fill(email);
            await cashier.getByLabel("Password", { exact: true }).fill("e2e-password-1");
            await cashier.getByRole("button", { name: "Create account" }).click();
            await expect(cashier.getByRole("heading", { name: "Check your inbox" })).toBeVisible({ timeout: 15_000 });

            const mail = await firebase.latestEmail(email, "VERIFY_EMAIL");
            await firebase.verifyEmail(mail.oobCode);
            await cashier.getByRole("button", { name: "I've verified my email" }).click();
            // the restaurant and role cards (their decoration covers the heading, so click the card)
            await cashier.locator("div.cursor-pointer").filter({ hasText: "Demo Bistro" }).click();
            await cashier.locator("div.cursor-pointer").filter({ hasText: "Cashier" }).click();
            await expect(cashier).toHaveURL(new RegExp(`/${SLUG}/cashier/dashboard$`), { timeout: 15_000 });

            // the owner sees the invite linked: no longer pending
            await staffScreen(page);
            await expect(page.locator("tr", { hasText: email })).toBeVisible();
            await expect(page.locator("tr", { hasText: email }).getByText("Invite pending")).toHaveCount(0);
        } finally {
            await theirs.close();
            await removeInvite(page.request, email);
        }
    });

    test("an account whose email isn't verified sees no restaurant", async ({ page, context, baseURL }) => {
        const user = await firebase.createUser(firebase.testEmail("unverified"));
        await signInAs(context, baseURL!, "owner");
        try {
            const invited = await page.request.post(`/api/restaurants/${SLUG}/staff`, {
                data: { name: "Not Yet", email: user.email, role: "chef" },
            });
            expect(invited.status()).toBe(201);
            const roles = await page.request.post("/api/auth/memberships", { data: { idToken: user.idToken } });
            expect(await roles.json()).toEqual({});

            await context.clearCookies();
            await page.goto("/login");
            await page.getByLabel("Email Address").fill(user.email);
            await page.getByLabel("Password", { exact: true }).fill(user.password);
            await page.getByRole("button", { name: "Login" }).click();
            await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible({ timeout: 15_000 });
            await expect(page.getByText("Demo Bistro")).toHaveCount(0);
        } finally {
            await signInAs(context, baseURL!, "owner");
            await removeInvite(page.request, user.email);
        }
    });
});
