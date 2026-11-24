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
        // Existing code has many of these; they are reported as warnings so CI can gate on the
        // real errors now and the warnings can be cleaned up over time.
        rules: {
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
            "@typescript-eslint/no-explicit-any": "warn",
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
