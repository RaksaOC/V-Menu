import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = [
    ...compat.extends("next/core-web-vitals", "next/typescript"),
    {
        // CL-13: errors, so CI blocks new ones (the old warnings are fixed).
        rules: {
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
            "@typescript-eslint/no-explicit-any": "error",
            "no-console": ["error", { allow: ["warn", "error"] }],
            "react-hooks/exhaustive-deps": "error",
            "import/order": ["error", { groups: ["builtin", "external", "internal", "parent", "sibling", "index"] }],
        },
    },
    {
        // CL-10: one HTTP client. Components call the typed functions in features/<area>/api.ts,
        // which use the shared client in lib/api.ts (token, error messages).
        files: ["src/**/*.{ts,tsx}"],
        ignores: ["src/lib/api.ts"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    paths: [{ name: "axios", message: "Use the typed functions in features/<area>/api.ts (they use lib/api.ts)." }],
                },
            ],
        },
    },
];

export default eslintConfig;
