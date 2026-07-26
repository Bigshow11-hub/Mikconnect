import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Le prerender Next.js importe la configuration cliente. Une URL HTTPS
// réservée évite de dépendre d'un secret ou d'une API active pendant un build
// local/CI, tout en laissant l'environnement de déploiement fournir l'URL réelle.
const buildEnvironment = {
  ...process.env,
  NEXT_PUBLIC_API_URL:
    process.env.NEXT_PUBLIC_API_URL?.trim() || "https://api.build.mikconnect.invalid",
};

const nextCli = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const result = spawnSync(process.execPath, [nextCli, "build"], {
  env: buildEnvironment,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
