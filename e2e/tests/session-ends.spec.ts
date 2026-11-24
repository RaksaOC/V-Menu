import { expect, test } from "@playwright/test";
import { SLUG, signInAs } from "./support/auth";
import * as firebase from "./support/firebase";

// SEC-03: a staff member's access ends within 30 seconds of being removed, on every service.
// Uses a real sign-in, against the Auth emulator (B6); see firebase-auth.spec.ts to run it locally.
test.describe("ending a staff session, against the Auth emulator (SEC-03)", () => {
    test.beforeAll(async ({ request }) => {
        const why = await firebase.emulatorProblem(request);
        if (why && process.env.CI) throw new Error(why);
        test.skip(Boolean(why), `${why}; see firebase-auth.spec.ts to run these`);
    });

    test("a removed cashier loses access within 30 seconds", async ({ page, context, browser, baseURL }) => {
        test.setTimeout(90_000);
        const user = await firebase.createUser(firebase.testEmail("removed"));
        await firebase.sendVerification(user.idToken);
        await firebase.verifyEmail((await firebase.latestEmail(user.email, "VERIFY_EMAIL")).oobCode);
        const idToken = await firebase.signIn(user.email, user.password); // now says the email is verified

        await signInAs(context, baseURL!, "owner");
        const staff = `/api/restaurants/${SLUG}/staff`;
        const invited = await page.request.post(staff, { data: { name: "Leaving Soon", email: user.email, role: "cashier" } });
        expect(invited.status()).toBe(201);
        const { _id } = (await invited.json()) as { _id: string };

        const theirs = await browser.newContext({ baseURL });
        try {
            expect((await theirs.request.post("/api/auth/login", { data: { idToken, role: "cashier", resSlug: SLUG } })).status()).toBe(
                200,
            );
            const menu = `/api/menu/${SLUG}/items`;
            const orders = `/api/orders/${SLUG}/bills`;
            expect((await theirs.request.get(menu)).status()).toBe(200);

            expect((await page.request.delete(`${staff}/${_id}`)).status()).toBe(200);
            const removedAt = Date.now();
            await expect.poll(async () => (await theirs.request.get(menu)).status(), { timeout: 32_000, intervals: [1_000] }).toBe(401);
            await expect.poll(async () => (await theirs.request.get(orders)).status(), { timeout: 32_000, intervals: [1_000] }).toBe(401);
            expect(Date.now() - removedAt).toBeLessThan(31_000);
        } finally {
            await theirs.close();
            await page.request.delete(`${staff}/${_id}`).catch(() => {});
        }
    });
});
