import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import importPlugin from "eslint-plugin-import";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  { ignores: [".next/**", "next-env.d.ts", "data/**", "playwright-report/**", "test-results/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // CLAUDE.md Architecture rule 1: src/engine/** is pure. It must not import
    // from anywhere outside src/engine/ — no database, no fetch, no React, no
    // framework. That purity is what makes the engine exhaustively testable,
    // which is what makes it safe to run live against a label or QR code
    // nobody on the team has seen before. Do not disable this rule.
    files: ["src/engine/**/*.{ts,tsx}"],
    plugins: { import: importPlugin },
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./src/engine",
              from: ["./src/app", "./src/adapters", "./src/db", "./src/design"],
              message:
                "src/engine/** may not import from outside src/engine/ (CLAUDE.md Architecture rule 1).",
            },
          ],
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "src/engine/** is pure — no React." },
            { name: "next", message: "src/engine/** is pure — no framework imports." },
            {
              name: "better-sqlite3",
              message: "src/engine/** is pure — no database access.",
            },
            {
              name: "drizzle-orm",
              message: "src/engine/** is pure — no database access.",
            },
          ],
          patterns: [
            {
              group: ["next/*"],
              message: "src/engine/** is pure — no framework imports.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
