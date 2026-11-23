import { expect, test } from "@playwright/test";
import { SLUG, signInAs } from "./support/auth";

// VM-05: each table has its own cart, and the order goes to the table in the URL.
test("a cart at T1 doesn't follow the customer to T2, and T2's order reaches the kitchen as T2", async ({ page, browser, baseURL }) => {
    await page.goto(`/${SLUG}/customer/T1`);
    await page.getByRole("button", { name: "Add to Cart" }).first().click();
    await expect(page.getByText("Added to cart!")).toBeVisible();

    // same browser, other table: empty cart
    await page.goto(`/${SLUG}/customer/T2/cart`);
    await expect(page.getByText("Your cart is empty")).toBeVisible();

    // order the second dish at T2
    await page.goto(`/${SLUG}/customer/T2`);
    await page.getByRole("button", { name: "Add to Cart" }).nth(1).click();
    await page.getByRole("button", { name: "View Cart" }).click();
    const placed = page.waitForResponse((r) => r.url().endsWith(`/api/orders/${SLUG}`) && r.request().method() === "POST");
    await page.getByRole("button", { name: "Place Order" }).click();
    const order = await (await placed).json();
    expect(order.table).toBe("T2");

    // the kitchen sees it as T2
    const chef = await browser.newContext({ baseURL });
    await signInAs(chef, baseURL!, "chef");
    const kitchen: { _id: string; table: string }[] = await (await chef.request.get(`/api/orders/${SLUG}/kitchen`)).json();
    expect(kitchen.find((o) => o._id === order._id)?.table).toBe("T2");
    await chef.close();

    // T1's cart is still there, untouched
    await page.goto(`/${SLUG}/customer/T1/cart`);
    await expect(page.getByRole("heading", { name: "Your Cart" })).toBeVisible();
    await expect(page.getByText("Your cart is empty")).toHaveCount(0);
});
