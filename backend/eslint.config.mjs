// CL-13: lint for the services and shared packages. `npm run lint` here, or from the repo root.
import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["**/dist/**", "**/coverage/**", "**/node_modules/**"] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["**/*.ts"],
        plugins: { import: importPlugin },
        rules: {
            // TypeScript already reports undefined names, with the real types
            "no-undef": "off",
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
            // logs go through the logger (pino); warn and error are for start-up problems
            "no-console": ["error", { allow: ["warn", "error"] }],
            "import/order": ["error", { groups: ["builtin", "external", "internal", "parent", "sibling", "index"] }],
        },
    },
);
