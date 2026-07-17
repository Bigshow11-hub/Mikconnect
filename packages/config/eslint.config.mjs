// @mikconnect/config — ESLint flat config partagée.
//
// Importée par chaque app/package via :
//   import base from "@mikconnect/config/eslint.config.mjs";
//   export default [base, { /* overrides locaux */ }];
//
// Note : Next.js 15 fournit eslint-config-next en legacy (.eslintrc), pas encore
// en flat. On utilise le flat config de typescript-eslint comme base, et on
// branche eslint-config-next via compat (FlatCompat) dans apps/web.

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/build/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/*.tsbuildinfo",
      "apps/api/prisma/migrations/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      // Conventions mikconnect : on préfère l'explicite.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // Pas de console.log en prod (warn pour permettre le debug local).
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Préfère const, mais sans casser les cas légitimes.
      "prefer-const": "error",
      // Pas de var.
      "no-var": "error",
      // Pas de debugger en prod.
      "no-debugger": "error",
    },
  },
  // Prettier en dernier : désactive les règles ESLint qui conflitent avec
  // le formatage (on ne veut pas "double-fix").
  eslintConfigPrettier,
];
