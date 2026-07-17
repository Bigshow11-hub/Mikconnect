// @mikconnect/web — ESLint flat config.
// Étend la base @mikconnect/config + plugin Next.js (legacy eslintrc → flat via FlatCompat).
import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import base from "@mikconnect/config/eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const nextConfigs = compat.extends("next/core-web-vitals", "next/typescript");

const config = [
  ...base,
  // next-env.d.ts est généré par Next.js : on ne le lint pas.
  { ignores: ["next-env.d.ts", ".next/**"] },
  // eslint-config-next (legacy) traduit en flat via compat.
  ...nextConfigs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // Next.js permissive sur les types React importés.
      "@typescript-eslint/no-explicit-any": "off",
      // allow_img_ok : Next/Image a son propre sizing.
      "@next/next/no-img-element": "warn",
    },
  },
  {
    // Les composants UI partagés sont consommés par web ; on ne lint pas
    // depuis web pour éviter la double lint. La lint de packages/ui se fait
    // dans son propre package.
    ignores: ["../../packages/ui/**"],
  },
];

export default config;
