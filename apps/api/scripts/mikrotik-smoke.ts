import { ConfigService } from "@nestjs/config";

import { MikrotikConnectorService } from "../src/routers/mikrotik-connector.service";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variable requise absente : ${name}`);
  return value;
}

function booleanValue(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (["1", "true", "yes", "oui"].includes(value)) return true;
  if (["0", "false", "no", "non"].includes(value)) return false;
  throw new Error(`${name} doit valoir true ou false.`);
}

function portValue(): number {
  const value = Number(process.env.MIKROTIK_SMOKE_PORT ?? 8729);
  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error("MIKROTIK_SMOKE_PORT doit être un port TCP valide.");
  }
  return value;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} Kio`;
  return `${(bytes / 1024 ** 2).toFixed(1)} Mio`;
}

async function main(): Promise<void> {
  const host = required("MIKROTIK_SMOKE_HOST");
  const apiUser = required("MIKROTIK_SMOKE_USER");
  const apiPassword = required("MIKROTIK_SMOKE_PASSWORD");
  const apiPort = portValue();
  const apiTls = booleanValue("MIKROTIK_SMOKE_TLS", apiPort === 8729);
  const rejectUnauthorized = booleanValue("MIKROTIK_TLS_REJECT_UNAUTHORIZED", true);

  if (!apiTls && apiPort === 8728) {
    console.warn(
      "AVERTISSEMENT : API 8728 n'est pas chiffrée. Ne l'utilisez que sur un LAN privé ou un VPN.",
    );
  }

  const connector = new MikrotikConnectorService(
    new ConfigService({
      MIKROTIK_MOCK: "false",
      MIKROTIK_API_TIMEOUT_SECONDS:
        process.env.MIKROTIK_API_TIMEOUT_SECONDS ?? "10",
      MIKROTIK_TLS_REJECT_UNAUTHORIZED: String(rejectUnauthorized),
    }),
  );
  const credentials = { host, apiUser, apiPassword, apiPort, apiTls };

  console.log(`1/2 Connexion réelle à ${host}:${apiPort} (${apiTls ? "API-SSL" : "API"})…`);
  const connection = await connector.testConnection(credentials);
  if (!connection.ok) {
    console.error(`ÉCHEC connexion : ${connection.message}`);
    process.exitCode = 2;
    return;
  }
  console.log(`OK connexion : ${connection.detail ?? connection.message}`);

  console.log("2/2 Lecture réelle de /ip/hotspot/active…");
  const active = await connector.getActiveHotspotUsers(credentials);
  if (!active.ok) {
    console.error(`ÉCHEC Hotspot : ${active.message}`);
    process.exitCode = 3;
    return;
  }

  const bytesIn = active.users.reduce((total, user) => total + user.bytesIn, 0);
  const bytesOut = active.users.reduce((total, user) => total + user.bytesOut, 0);
  console.log(
    `OK Hotspot : ${active.users.length} session(s), entrant ${formatBytes(bytesIn)}, sortant ${formatBytes(bytesOut)}.`,
  );
  for (const user of active.users.slice(0, 10)) {
    console.log(
      `- ${user.username || "(sans nom)"} · ${user.address || "IP inconnue"} · ${user.macAddress || "MAC inconnue"} · ${user.uptime || "durée inconnue"}`,
    );
  }
  if (active.users.length > 10) {
    console.log(`… et ${active.users.length - 10} autre(s) session(s).`);
  }
  console.log("SUCCÈS : le chemin réel mikconnect → RouterOS fonctionne en lecture seule.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ÉCHEC smoke test : ${message}`);
  process.exitCode = 1;
});
