import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        coverage: {
            provider: "v8",
            // Every source file counts, even ones no test imports. The entry points only wire
            // things together and are exercised by the integration job instead.
            include: ["src/**/*.ts"],
            exclude: ["src/index.ts", "src/seed.ts"],
            reporter: ["text", "text-summary", "json-summary", "html"],
            reportsDirectory: "coverage",
            // CI fails below these. The business rules (CL-04) must stay almost fully covered.
            thresholds: { lines: 70, "src/services/**": { lines: 90, functions: 90, branches: 90, statements: 90 } },
        },
    },
});
