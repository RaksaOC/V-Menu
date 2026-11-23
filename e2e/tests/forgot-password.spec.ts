import { expect, test } from "@playwright/test";
import { SLUG } from "./support/auth";
import * as firebase from "./support/firebase";

// VM-14: "Forgot password?" on every login page. Against the Auth emulator (B6), whose mailbox
// holds the reset email; see firebase-auth.spec.ts for how to run these locally.
const SENT = "If that email has an account, we sent a link.";
const PAGES = ["/login", "/owner/login", `/${SLUG}/cashier/login`, `/${SLUG}/kitchen/login`];

test.describe("forgot password, against the Auth emulator (VM-14)", () => {
    test.beforeAll(async ({ request }) => {
        const why = await firebase.emulatorProblem(request);
        if (why && process.env.CI) throw new Error(why);
        test.skip(Boolean(why), `${why}; see firebase-auth.spec.ts to run these`);
    });

    // never the real Firebase
    test.beforeEach(async ({ context }) => {
        await context.route(/^https:\/\/[a-z0-9-]+\.googleapis\.com\//, (route) => route.abort("blockedbyclient"));
    });

    for (const path of PAGES) {
        test(`${path}: the reset email reaches the mailbox, and the new password works`, async ({ page }) => {
            const user = await firebase.createUser(firebase.testEmail("reset"));
            await page.goto(path);
            await page.getByRole("button", { name: "Forgot password?" }).click();
            await page.getByLabel("Email Address").fill(user.email);
            await page.getByRole("button", { name: "Send reset link" }).click();
            await expect(page.getByText(SENT)).toBeVisible({ timeout: 15_000 });

            const mail = await firebase.latestEmail(user.email, "PASSWORD_RESET");
            await firebase.resetPassword(mail.oobCode, "a-new-password-2");
            await expect(firebase.signIn(user.email, user.password)).rejects.toThrow(/INVALID/);
            expect(await firebase.signIn(user.email, "a-new-password-2")).toBeTruthy();
        });
    }

    test("an email with no account gets the same answer, and no email is sent", async ({ page }) => {
        const nobody = firebase.testEmail("nobody");
        await page.goto("/owner/login");
        await page.getByRole("button", { name: "Forgot password?" }).click();
        await page.getByLabel("Email Address").fill(nobody);
        await page.getByRole("button", { name: "Send reset link" }).click();
        await expect(page.getByText(SENT)).toBeVisible({ timeout: 15_000 });
        await expect(firebase.latestEmail(nobody, "PASSWORD_RESET", 500)).rejects.toThrow(/No PASSWORD_RESET email/);
    });
});
