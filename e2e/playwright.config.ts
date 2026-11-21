import { defineConfig, devices } from "@playwright/test";

// Runs against an already running stack (docker compose up + seed); it does not start one.
//   BASE_URL=http://localhost:3400 npx playwright test
export default defineConfig({
    testDir: "./tests",
    timeout: 60_000,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL: process.env.BASE_URL ?? "http://localhost:3400",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
