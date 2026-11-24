import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // SEC-01: the API tests sign in with a Bearer header; browsers only ever use the cookie.
        env: { AUTH_ALLOW_BEARER: "true" },
        coverage: {
            provider: "v8",
            // Every source file counts, even ones no test imports. The entry points only wire
            // things together and are exercised by the integration job instead.
            include: ["src/**/*.ts"],
            exclude: ["src/index.ts", "src/seed.ts"],
            reporter: ["text", "text-summary", "json-summary", "html"],
            reportsDirectory: "coverage",
            // B3: CI fails below these. The lines minimum started at today's number (98%, 2026-11-23);
            // raise it as tests are added, never lower it (scripts/coverage.test.mjs). Target: 80%.
            // The business rules (CL-04) must stay almost fully covered.
            thresholds: { lines: 98, "src/services/**": { lines: 90, functions: 90, branches: 90, statements: 90 } },
        },
    },
});
