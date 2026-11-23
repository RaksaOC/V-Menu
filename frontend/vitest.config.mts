import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Frontend unit tests (B1): Vitest + React Testing Library in jsdom, with MSW standing in for
// the API. Run with `npm test`. CI runs them in the `test (frontend)` job, before lint and build.
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    test: {
        environment: "jsdom",
        include: ["test/**/*.test.{ts,tsx}"],
        setupFiles: ["./test/setup.ts"],
        css: false,
        restoreMocks: true,
    },
});
