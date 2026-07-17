const REQUIRED_PRODUCTION_KEYS = [
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "MIKROTIK_ENCRYPTION_KEY",
  "CINETPAY_API_KEY",
  "CINETPAY_SITE_ID",
  "CINETPAY_SECRET_KEY",
  "SMS_API_URL",
  "SMS_API_KEY",
  "PUBLIC_API_URL",
  "PUBLIC_WEB_URL",
  "CORS_ORIGIN",
] as const;

function validHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Empêche un déploiement qui afficherait des données simulées ou pointerait
 * vers des services locaux. Le développement et les tests conservent leurs
 * adapters isolés, mais la production échoue immédiatement si elle n'est pas
 * reliée aux vrais fournisseurs.
 */
export function assertProductionConfiguration(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== "production") return;

  const missing = REQUIRED_PRODUCTION_KEYS.filter((key) => !env[key]?.trim());
  if (missing.length) {
    throw new Error(`Configuration production incomplète : ${missing.join(", ")}`);
  }

  if (env.MIKROTIK_MOCK !== "false") {
    throw new Error("MIKROTIK_MOCK doit valoir false en production.");
  }
  if (env.CINETPAY_MOCK !== "false") {
    throw new Error("CINETPAY_MOCK doit valoir false en production.");
  }
  if (!env.SMS_PROVIDER || env.SMS_PROVIDER === "local") {
    throw new Error("SMS_PROVIDER doit désigner une passerelle réelle en production.");
  }
  if (env.MIKROTIK_TLS_REJECT_UNAUTHORIZED !== "true") {
    throw new Error("La validation TLS MikroTik doit être activée en production.");
  }

  for (const key of ["PUBLIC_API_URL", "PUBLIC_WEB_URL"] as const) {
    if (!validHttpsUrl(env[key]!)) {
      throw new Error(`${key} doit être une URL HTTPS publique en production.`);
    }
  }

  if (/localhost|127\.0\.0\.1/i.test(env.CORS_ORIGIN!)) {
    throw new Error("CORS_ORIGIN ne peut pas contenir une origine locale en production.");
  }
  if (/change-me/i.test(`${env.JWT_ACCESS_SECRET} ${env.JWT_REFRESH_SECRET}`)) {
    throw new Error("Les secrets JWT de démonstration sont interdits en production.");
  }
}
