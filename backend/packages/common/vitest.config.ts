import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // SEC-01: the API tests sign in with a Bearer header; browsers only ever use the cookie.
        env: { AUTH_ALLOW_BEARER: "true" },
        setupFiles: ["./test/setup.ts"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: ["src/index.ts"],
            reporter: ["text", "text-summary", "json-summary", "html"],
            reportsDirectory: "coverage",
            // B3: CI fails below this. It started at today's number (94%, 2026-11-23); raise it as
            // tests are added, never lower it (scripts/coverage.test.mjs). Target: 80%.
            thresholds: { lines: 94 },
        },
    },
});
