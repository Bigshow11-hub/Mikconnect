/**
 * Configuration mikconnect — apps/web.
 * L'URL API est configurable via NEXT_PUBLIC_API_URL (Vercel env, .env.local).
 * En dev : http://localhost:4000 (PORT par défaut de apps/api).
 */
const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

if (
  process.env.NODE_ENV === "production" &&
  (!configuredApiUrl || /localhost|127\.0\.0\.1/i.test(configuredApiUrl))
) {
  throw new Error("NEXT_PUBLIC_API_URL doit pointer vers l'API HTTPS publique en production.");
}

export const config = {
  apiBaseUrl: configuredApiUrl ?? "http://localhost:4000",
} as const;

/**
 * Storage keys pour l'auth (access + refresh).
 * Le refresh est stocké en localStorage (httpOnly cookie interdit car
 * l'API est sur un autre host en dev). L'access est en mémoire (Zustand)
 * pour limiter l'exposition.
 */
export const STORAGE_KEYS = {
  refreshToken: "mikconnect.refreshToken",
} as const;
