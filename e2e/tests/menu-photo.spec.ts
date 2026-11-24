import { expect, test } from "@playwright/test";
import { PNG } from "pngjs";
import { SLUG, signInAs } from "./support/auth";

// VM-02: the owner adds a dish with a real photo; the customer menu shows it.
// PHOTOS-S3: the photo goes from the browser straight to object storage (MinIO) with a signed
// form; menu-service then checks it and keeps a WebP copy, and the image link redirects there.
function photo(): Buffer {
    // 1200 x 900 of noise: about 3 MB as a PNG, far over the old 2,000-character limit
    const png = new PNG({ width: 1200, height: 900 });
    for (let i = 0, s = 1; i < png.data.length; i++) png.data[i] = i % 4 === 3 ? 255 : (s = (s * 1103515245 + 12345) & 0x7fffffff) & 255;
    return PNG.sync.write(png);
}

test("the owner adds a dish with a photo and customers see it", async ({ page, context, baseURL }) => {
    await signInAs(context, baseURL!, "owner");
    const name = `E2E Dish ${Date.now()}`;
    await page.goto("/owner");
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page.getByRole("button", { name: "Add Item" }).click();

    await page.locator('input[type="file"]').setInputFiles({ name: "dish.png", mimeType: "image/png", buffer: photo() });
    await page.getByPlaceholder("Enter item name").fill(name);
    await page.getByPlaceholder("0.00").fill("4.5");
    const signed = page.waitForResponse((r) => r.url().endsWith(`/api/menu/${SLUG}/images/uploads`) && r.request().method() === "POST");
    const stored = page.waitForResponse((r) => !r.url().includes("/api/") && r.request().method() === "POST");
    const uploaded = page.waitForResponse((r) => r.url().endsWith(`/api/menu/${SLUG}/images`) && r.request().method() === "POST");
    const saved = page.waitForResponse((r) => r.url().endsWith(`/api/menu/${SLUG}/items`) && r.request().method() === "POST");
    await page.getByRole("button", { name: "Save" }).click();
    const form = await signed;
    expect(form.status()).toBe(201);
    const { url: storageUrl } = (await form.json()) as { url: string };
    const post = await stored;
    expect(post.url()).toBe(storageUrl); // straight to storage, not through the app
    expect(new URL(storageUrl).origin).not.toBe(new URL(baseURL!).origin);
    expect(post.status()).toBe(204);
    expect((await uploaded).status()).toBe(201);
    const item = await (await saved).json();
    expect(item.image).toMatch(new RegExp(`^/api/menu/${SLUG}/images/[a-f0-9]{24}$`));

    try {
        // the customer's menu shows the photo, served small and as WebP
        await page.goto(`/${SLUG}/customer/T1`);
        const img = page.getByRole("img", { name });
        await expect(img).toBeVisible();
        await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(800);
        const link = await page.request.get(item.image, { maxRedirects: 0 });
        expect(link.status()).toBe(302); // to a signed link in storage
        expect(new URL(link.headers()["location"]!).origin).toBe(new URL(storageUrl).origin);
        const served = await page.request.get(item.image);
        expect(served.headers()["content-type"]).toBe("image/webp");
        expect(served.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
        expect((await served.body()).length).toBeLessThan(1_000_000);
    } finally {
        await page.request.delete(`/api/menu/${SLUG}/items/${item._id}`); // leave the demo menu as it was
    }
});
