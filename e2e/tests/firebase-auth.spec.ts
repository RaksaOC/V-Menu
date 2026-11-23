import { expect, test } from "@playwright/test";
import * as firebase from "./support/firebase";

// B6: real Firebase sign-ins, against the Auth emulator, never a real Firebase project. CI starts
// the emulator with the stack (the e2e profile). Locally the tests skip unless it's running:
//   docker compose --profile e2e up -d auth-emulator   (and a frontend/restaurant-service with E2E=1)
test.describe("Firebase sign-in, against the Auth emulator (B6)", () => {
    test.beforeAll(async () => {
        const running = await firebase.isRunning();
        if (!running && process.env.CI) throw new Error(`The Auth emulator isn't running at ${firebase.EMULATOR}`);
        test.skip(!running, `start the Auth emulator at ${firebase.EMULATOR} to run these`);
    });

    // Never the real thing: a build that isn't pointed at the emulator fails here instead of
    // creating accounts in a real Firebase project.
    test.beforeEach(async ({ context }) => {
        await context.route(/^https:\/\/[a-z0-9-]+\.googleapis\.com\//, (route) => route.abort("blockedbyclient"));
    });

    test("a new owner signs up, then signs in on the owner login page", async ({ page, context }) => {
        const email = firebase.testEmail("owner");
        const password = "e2e-password-1";

        await page.goto("/signup");
        await page.locator("form input[type=text]").nth(0).fill(`E2E Bistro ${Date.now()}`);
        await page.locator("form input[type=text]").nth(1).fill("E2E Owner");
        await page.locator("form input[type=email]").fill(email);
        await page.locator("form input[type=password]").fill(password);
        await page.locator("form [type=submit]").click();
        await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
        expect(await firebase.userExists(email)).toBe(true); // the account is in the emulator

        await context.clearCookies();
        await page.goto("/owner/login");
        await page.getByLabel("Email Address").fill(email);
        await page.getByLabel("Password", { exact: true }).fill(password);
        await page.locator("form [type=submit]").click();
        await expect(page).toHaveURL(/\/owner$/, { timeout: 15_000 });
        expect((await context.cookies()).some((c) => c.name === "token")).toBe(true); // the app's session cookie
    });

    test("a wrong password is refused, and no session starts", async ({ page, context }) => {
        const user = await firebase.createUser(firebase.testEmail("wrong"));
        await page.goto("/owner/login");
        await page.getByLabel("Email Address").fill(user.email);
        await page.getByLabel("Password", { exact: true }).fill("not-the-password");
        await page.locator("form [type=submit]").click();
        await expect(page.getByText("Incorrect email or password")).toBeVisible();
        expect((await context.cookies()).some((c) => c.name === "token")).toBe(false);
    });

    test("the helper reads verification and password-reset emails", async () => {
        const user = await firebase.createUser(firebase.testEmail("mail"));

        await firebase.sendVerification(user.idToken);
        const verify = await firebase.latestEmail(user.email, "VERIFY_EMAIL");
        expect(verify.oobLink).toContain(verify.oobCode);
        await firebase.verifyEmail(verify.oobCode);

        await firebase.sendPasswordReset(user.email);
        const reset = await firebase.latestEmail(user.email, "PASSWORD_RESET");
        await firebase.resetPassword(reset.oobCode, "a-new-password-2");
        await expect(firebase.signIn(user.email, user.password)).rejects.toThrow(/INVALID/);
        expect(await firebase.signIn(user.email, "a-new-password-2")).toBeTruthy();
    });
});
