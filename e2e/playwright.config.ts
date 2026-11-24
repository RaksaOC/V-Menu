import { defineConfig, devices } from "@playwright/test";

// Runs against an already running stack (docker compose up + seed); it does not start one.
//   BASE_URL=http://localhost:3400 npx playwright test
/** The specs a customer's journey runs through: they also run in the mobile project. */
const CUSTOMER_SPECS = ["customer-order", "qr", "errors", "cart-per-table", "menu-categories"].map((name) => `**/${name}.spec.ts`);

export default defineConfig({
    testDir: "./tests",
    timeout: 60_000,
    // CL-14: 5 s (the default) was too short on a busy machine: a page compiling in dev, or a
    // client-side navigation in CI with every worker busy, made specs flaky. Waits stay
    // condition-based; this is only how long a condition may take.
    expect: { timeout: 10_000 },
    // B8: in CI, a forgotten test.only is an error. It would otherwise run that one test and pass.
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    // B5: the screenshot references (screens.spec.ts), one set, made on Linux
    snapshotPathTemplate: "{testDir}/../screens/{arg}{ext}",
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL: process.env.BASE_URL ?? "http://localhost:3400",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        // B4: the customer specs again on a small phone: most customers order from one.
        {
            name: "mobile",
            testMatch: CUSTOMER_SPECS,
            use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true },
        },
    ],
});
