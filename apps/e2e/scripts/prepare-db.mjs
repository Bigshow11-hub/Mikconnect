import { spawnSync } from "node:child_process";

const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5433/mikconnect_e2e?schema=public";

const parsed = new URL(databaseUrl);
const databaseName = parsed.pathname.replace(/^\//, "");
const schemaName = parsed.searchParams.get("schema") ?? "public";

if (!`${databaseName}:${schemaName}`.toLowerCase().includes("e2e")) {
  throw new Error(
    "Refus de réinitialiser la base : E2E_DATABASE_URL doit contenir « e2e » dans le nom de base ou de schéma.",
  );
}

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const environment = { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: "test" };

run([
  "--filter",
  "@mikconnect/api",
  "prisma",
  "migrate",
  "reset",
  "--force",
  "--skip-seed",
  "--skip-generate",
]);
run(["--filter", "@mikconnect/api", "db:seed:e2e"]);
run(["--filter", "@mikconnect/api", "build"]);
run(["--filter", "@mikconnect/web", "build"], {
  NEXT_PUBLIC_API_URL: process.env.E2E_API_URL ?? "http://127.0.0.1:4100",
});

function run(args, extraEnvironment = {}) {
  const result = spawnSync(pnpm, args, {
    cwd: new URL("../../..", import.meta.url),
    env: { ...environment, ...extraEnvironment },
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
