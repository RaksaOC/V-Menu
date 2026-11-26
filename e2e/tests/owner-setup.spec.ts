import { expect, test, type Page } from "@playwright/test";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import * as firebase from "./support/firebase";

// B4: a new owner's journey, from sign-up to a table's QR code: sign up, verify the email, sign
// in, add a category, a dish with a photo and a table, then open the table's QR code. Signs up
// against the Auth emulator (B6), never a real Firebase project; see firebase-auth.spec.ts for
// how to run these locally.
test.describe("a new owner sets up their restaurant", () => {
    test.beforeAll(async ({ request }) => {
        const why = await firebase.emulatorProblem(request);
        if (why && process.env.CI) throw new Error(why);
        test.skip(Boolean(why), `${why}; see firebase-auth.spec.ts to run these`);
    });

    // Never the real thing: a build that isn't pointed at the emulator fails here instead of
    // creating accounts in a real Firebase project.
    test.beforeEach(async ({ context }) => {
        await context.route(/^https:\/\/[a-z0-9-]+\.googleapis\.com\//, (route) => route.abort("blockedbyclient"));
    });

    /** A small PNG, as a phone camera would give (just smaller). */
    function photo(): Buffer {
        const png = new PNG({ width: 64, height: 64 });
        for (let i = 0; i < png.data.length; i += 4) png.data.set([200, ((i / 4) % 64) << 2, 80, 255], i);
        return PNG.sync.write(png);
    }

    async function signUpAndSignIn(page: Page): Promise<string> {
        const email = firebase.testEmail("setup");
        const password = "e2e-password-1";
        await page.goto("/signup");
        await page.locator("form input[type=text]").nth(0).fill(`Setup Bistro ${Date.now()}`);
        await page.locator("form input[type=text]").nth(1).fill("Setup Owner");
        await page.locator("form input[type=email]").fill(email);
        await page.locator("form input[type=password]").fill(password);
        const signedUp = page.waitForResponse((r) => r.url().endsWith("/api/auth/signup") && r.request().method() === "POST");
        await page.locator("form [type=submit]").click();
        const { slug } = (await (await signedUp).json()) as { slug: string };

        // VM-13: verify the email, then sign in on the owner login page
        await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible({ timeout: 15_000 });
        await firebase.verifyEmail((await firebase.latestEmail(email, "VERIFY_EMAIL")).oobCode);
        await page.getByRole("button", { name: "I've verified my email" }).click();
        await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
        await page.context().clearCookies();
        await page.goto("/owner/login");
        await page.getByLabel("Email Address").fill(email);
        await page.getByLabel("Password", { exact: true }).fill(password);
        await page.locator("form [type=submit]").click();
        await expect(page).toHaveURL(/\/owner$/, { timeout: 15_000 });
        return slug;
    }

    test("sign up, add a category, a dish with a photo and a table, open its QR code", async ({ page, baseURL }) => {
        const slug = await signUpAndSignIn(page);

        // a category
        await page.getByRole("button", { name: "Menu", exact: true }).click();
        await page.getByRole("button", { name: /Categories/ }).click();
        await page.getByLabel("New category").fill("Noodles");
        await page.getByRole("button", { name: "Add", exact: true }).click();
        await expect(page.getByRole("dialog").getByText("Noodles", { exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Done" }).click();

        // a dish with a photo, in that category
        const name = `Kuy Teav ${Date.now().toString(36)}`;
        await page.getByRole("button", { name: "Add Item" }).click();
        await page.locator('input[type="file"]').setInputFiles({ name: "dish.png", mimeType: "image/png", buffer: photo() });
        await page.getByPlaceholder("Enter item name").fill(name);
        await page.getByPlaceholder("0.00").fill("3.5");
        await page.getByRole("combobox", { name: "Category", exact: true }).selectOption({ label: "Noodles" });
        const saved = page.waitForResponse((r) => r.url().endsWith(`/api/menu/${slug}/items`) && r.request().method() === "POST");
        await page.getByRole("button", { name: "Save" }).click();
        const item = (await (await saved).json()) as { image: string; categoryId: string };
        expect(item.image).toMatch(new RegExp(`^/api/menu/${slug}/images/[a-f0-9]{24}$`));
        expect(item.categoryId).toBeTruthy();
        await expect(page.getByRole("heading", { name })).toBeVisible();

        // a table
        await page.getByRole("button", { name: "Tables", exact: true }).click();
        await page.getByRole("button", { name: "Add Table" }).click();
        await page.getByRole("dialog").getByRole("button", { name: "Add Table" }).click();
        const view = page.getByRole("button", { name: "View QR Code" });
        await expect(view).toHaveCount(1);

        // its QR code holds the table's link, and the link opens that table's page
        await view.click();
        const img = page.getByRole("dialog").getByRole("img", { name: /^QR code for table / });
        await expect(img).toBeVisible();
        const table = (await img.getAttribute("alt"))!.replace("QR code for table ", "");
        const png = PNG.sync.read(Buffer.from((await img.getAttribute("src"))!.split(",")[1]!, "base64"));
        const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
        expect(code?.data).toMatch(new RegExp(`^${new URL(`/${slug}/t/`, baseURL).href}[\\w-]+$`));
        await page.goto(code!.data);
        // a new table starts closed (VM-04), so the page says so, for this table
        await expect(page.getByRole("heading", { name: `Table ${table} isn't open yet` })).toBeVisible();
    });
});
