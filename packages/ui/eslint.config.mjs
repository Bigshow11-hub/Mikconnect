// @mikconnect/ui — ESLint flat config.
// Librairie React (TSX, ESM). Étend la base partagée + règles React.
import base from "@mikconnect/config/eslint";

export default [
  ...base,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // Librairie : pas de React import inutilisé (jsx runtime automatique).
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
    },
  },
];
