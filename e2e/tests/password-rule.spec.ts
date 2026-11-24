import { expect, test } from "@playwright/test";
import * as firebase from "./support/firebase";

// SEC-08: a 7-character password is refused when an account is made, and no account is created.
// Against the Auth emulator (B6); see firebase-auth.spec.ts to run it locally.
const RULE = "Use at least 8 characters, with a letter and a number";

test.describe("new passwords, against the Auth emulator (SEC-08)", () => {
    test.beforeAll(async ({ request }) => {
        const why = await firebase.emulatorProblem(request);
        if (why && process.env.CI) throw new Error(why);
        test.skip(Boolean(why), `${why}; see firebase-auth.spec.ts to run these`);
    });
    test.beforeEach(async ({ context }) => {
        await context.route(/^https:\/\/[a-z0-9-]+\.googleapis\.com\//, (route) => route.abort("blockedbyclient"));
    });

    test("creating a staff account at /login with 7 characters is refused", async ({ page }) => {
        const email = firebase.testEmail("short");
        await page.goto("/login");
        await page.getByRole("button", { name: /create an account/i }).click();
        await page.getByLabel("Email Address").fill(email);
        await page.getByLabel("Password", { exact: true }).fill("abc1234");
        await page.getByRole("button", { name: "Create account" }).click();
        await expect(page.getByText(RULE)).toBeVisible();
        expect(await firebase.userExists(email)).toBe(false);
    });

    test("the owner sign-up with 7 characters is refused", async ({ page }) => {
        const email = firebase.testEmail("short-owner");
        await page.goto("/signup");
        await page.locator("form input[type=text]").nth(0).fill("Short Password Bistro");
        await page.locator("form input[type=text]").nth(1).fill("Owner");
        await page.locator("form input[type=email]").fill(email);
        await page.locator("form input[type=password]").fill("abc1234");
        await page.locator("form [type=submit]").click();
        await expect(page.getByText(RULE)).toBeVisible();
        expect(await firebase.userExists(email)).toBe(false);
    });
});
