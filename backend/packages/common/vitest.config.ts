import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // SEC-01: the API tests sign in with a Bearer header; browsers only ever use the cookie.
        env: { AUTH_ALLOW_BEARER: "true" },
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: ["src/index.ts"],
            reporter: ["text", "text-summary", "json-summary", "html"],
            reportsDirectory: "coverage",
            // CI fails below this, the same minimum as the services.
            thresholds: { lines: 70 },
        },
    },
});
