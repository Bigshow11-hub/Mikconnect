const DEFAULT_WEB_ORIGIN = "http://localhost:3000";

/**
 * Construit la liste CORS sans accepter le joker, incompatible avec les
 * credentials et dangereux sur les routes authentifiées.
 */
export function parseCorsOrigins(value?: string): string[] {
  const origins = (value ?? DEFAULT_WEB_ORIGIN)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.includes("*")) {
    throw new Error("CORS_ORIGIN ne peut pas contenir '*' lorsque les credentials sont activés");
  }

  return [...new Set(origins.length ? origins : [DEFAULT_WEB_ORIGIN])];
}
