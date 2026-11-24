import { expect, test } from "@playwright/test";
import * as firebase from "./support/firebase";

// B6: real Firebase sign-ins, against the Auth emulator, never a real Firebase project. CI starts
// the emulator with the stack (the e2e profile). Locally they skip unless the emulator runs and
// the frontend and restaurant-service were started for it:
//   docker compose -f infra/compose/docker-compose.yml --profile e2e up -d auth-emulator
//   restaurant-service: E2E=1 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIREBASE_PROJECT_ID=demo-vmenu
//   frontend: NEXT_PUBLIC_E2E=1 NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL=http://127.0.0.1:9099 NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-vmenu
test.describe("Firebase sign-in, against the Auth emulator (B6)", () => {
    test.beforeAll(async ({ request }) => {
        // the emulator is up, and the app under test is an E2E build: only those put the
        // emulator's address in their CSP (frontend/security-headers.ts)
        const running = await firebase.isRunning();
        const res = await request.get("/owner/login");
        const csp = res.headers()["content-security-policy"] ?? res.headers()["content-security-policy-report-only"] ?? "";
        const wired = csp.includes(firebase.EMULATOR);
        const why = !running ? `the Auth emulator isn't running at ${firebase.EMULATOR}` : !wired ? "this frontend isn't an E2E build" : "";
        if (why && process.env.CI) throw new Error(why);
        test.skip(Boolean(why), `${why}; see the comment above to run these`);
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
