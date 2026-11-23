import { expect, test } from "@playwright/test";
import { signInAs, SLUG } from "./support/auth";

// VM-28: a note the customer types in the cart shows on the kitchen card.
const TABLE = process.env.NOTES_TABLE ?? "T1";

test("a note typed by the customer is shown on the kitchen card", async ({ browser, page, baseURL }) => {
    const note = `no chilli ${Date.now().toString(36)}`;
    await page.goto(`/${SLUG}/customer/${TABLE}`);
    await page.getByRole("button", { name: "Add to Cart" }).first().click();
    await page.getByRole("button", { name: "View Cart" }).click();
    await page
        .getByRole("textbox", { name: /^Note for / })
        .first()
        .fill(note);
    await page.getByRole("textbox", { name: "Note for the kitchen" }).fill("table by the window");
    const placed = page.waitForResponse((r) => r.url().includes(`/api/orders/${SLUG}`) && r.request().method() === "POST");
    await page.getByRole("button", { name: "Place Order" }).click();
    const order = (await (await placed).json()) as { _id: string };

    const kitchen = await browser.newContext({ baseURL });
    try {
        await signInAs(kitchen, baseURL!, "chef");
        const chef = await kitchen.newPage();
        await chef.goto(`/${SLUG}/kitchen`);
        const card = chef.locator("article").filter({ hasText: `Order #${order._id.slice(-6).toUpperCase()}` });
        await expect(card.getByText(note)).toBeVisible({ timeout: 15_000 });
        await expect(card.getByText("table by the window")).toBeVisible();
    } finally {
        await kitchen.close();
    }
});
