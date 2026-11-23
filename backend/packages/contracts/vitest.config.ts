import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: ["src/index.ts"],
            reporter: ["text", "text-summary", "json-summary", "html"],
            reportsDirectory: "coverage",
            // B3: CI fails below this. Schemas are small and fully exercised by their tests.
            thresholds: { lines: 95 },
        },
    },
});
