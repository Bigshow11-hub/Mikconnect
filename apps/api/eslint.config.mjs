// @mikconnect/api — ESLint flat config.
// Backend NestJS (CommonJS, TypeScript). Étend la base partagée.
import base from "@mikconnect/config/eslint";

export default [
  ...base,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      // NestJS utilise largement les decorators et l'ordering par classe.
      "@typescript-eslint/no-explicit-any": "warn",
      // Les DTOs et entités utilisent des champs optionnels avec !
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];
