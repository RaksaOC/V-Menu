import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Frontend unit tests (B1): Vitest + React Testing Library in jsdom, with MSW standing in for
// the API. Run with `npm test`. CI runs them in the `test (frontend)` job, before lint and build.
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
            // CL-05: the API shapes, straight from the backend's source; zod from this package
            "@vmenu/contracts": fileURLToPath(new URL("../backend/packages/contracts/src/index.ts", import.meta.url)),
            zod: fileURLToPath(new URL("./node_modules/zod", import.meta.url)),
        },
    },
    test: {
        environment: "jsdom",
        include: ["test/**/*.test.{ts,tsx}"],
        setupFiles: ["./test/setup.ts"],
        css: false,
        restoreMocks: true,
        coverage: {
            provider: "v8",
            // Every source file counts, even ones no test imports yet.
            include: ["src/**/*.{ts,tsx}"],
            exclude: ["src/**/*.d.ts"],
            reporter: ["text-summary", "json-summary", "html"],
            reportsDirectory: "coverage",
            // B3: CI fails below this. It started at today's number (34%, 2026-11-23); raise it as
            // tests are added, never lower it (scripts/coverage.test.mjs). Target: 60%.
            thresholds: { lines: 34 },
        },
    },
});
