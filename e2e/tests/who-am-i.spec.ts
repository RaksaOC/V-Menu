import { expect, test } from "@playwright/test";
import { SLUG, signInAs } from "./support/auth";

// VM-20: the dashboards show the real person, and the cashier page renders without a console error.
test("the owner header shows the owner's real name", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, "owner");
    await page.goto("/owner");
    const account = page.locator("header").getByRole("button").first();
    await expect(account).toContainText("Demo Owner");
    await expect(account).toContainText("owner@demo.local");
    await expect(page.getByText("John Doe")).toHaveCount(0);
    await expect(page.getByText("owner@gmail.com")).toHaveCount(0);
});

test("the cashier dashboard shows who is signed in, with no server-render error", async ({ page, context, baseURL }) => {
    const problems: string[] = [];
    page.on("pageerror", (e) => problems.push(e.message));
    page.on("console", (m) => {
        if (m.type() === "error" && /localStorage|hydrat/i.test(m.text())) problems.push(m.text());
    });
    await signInAs(context, baseURL!, "cashier");
    await page.goto(`/${SLUG}/cashier/dashboard`);
    await expect(page.locator("header").getByRole("button").first()).toContainText("Demo Owner");
    await expect(page.getByText("cashier@restaurants.com")).toHaveCount(0);
    expect(problems).toEqual([]);
});
