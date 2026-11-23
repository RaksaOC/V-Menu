import { expect, test } from "@playwright/test";
import { signInAs, SLUG } from "./support/auth";
import { dishesOf } from "./support/menu";

// VM-29: a new order plays the kitchen's sound. The browser's Web Audio is stubbed, and counts
// the chimes: the test checks the page asks for one, not that a speaker made a noise.
test("a new order calls the sound player", async ({ page, context, baseURL }) => {
    await context.addInitScript(() => {
        const w = window as unknown as { __chimes: number; AudioContext: unknown };
        w.__chimes = 0;
        const param = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
        w.AudioContext = class {
            state = "suspended";
            currentTime = 0;
            destination = {};
            async resume() {
                this.state = "running";
            }
            createOscillator() {
                w.__chimes += 1;
                return { type: "", frequency: param, connect() {}, start() {}, stop() {} };
            }
            createGain() {
                return { gain: param, connect() {} };
            }
        };
    });
    await signInAs(context, baseURL!, "chef");
    await page.goto(`/${SLUG}/kitchen`);
    await page.getByRole("button", { name: "Start service" }).click();
    const chimes = () => page.evaluate(() => (window as unknown as { __chimes: number }).__chimes);
    const before = await chimes();

    const [dish] = dishesOf(await (await page.request.get(`/api/menu/${SLUG}/public/items`)).json());
    const placed = await page.request.post(`/api/orders/${SLUG}`, { data: { table: "T2", orderedItems: [{ item: dish, quantity: 1 }] } });
    expect(placed.status()).toBe(201);
    const number = ((await placed.json())._id as string).slice(-6).toUpperCase();

    await expect(page.locator("article").filter({ hasText: `Order #${number}` })).toBeVisible({ timeout: 15_000 });
    await expect.poll(chimes, { timeout: 5_000 }).toBeGreaterThan(before);
});
