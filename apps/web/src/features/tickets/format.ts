import type { Currency } from "./types";

/**
 * Formatage montants — mikconnect (The Ledger Rule).
 * Mono tabulaire côté UI (classe font-mono). Ici on formate la valeur.
 */
export function formatAmount(amount: number, currency: Currency): string {
  const locale = currency === "XOF" ? "fr-FR" : "fr-GN";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount);
}

export function formatCurrency(amount: number, currency: Currency): string {
  return `${formatAmount(amount, currency)} ${currency}`;
}

/** Durée en minutes → libellé FR lisible. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes === 60) return "1 heure";
  if (minutes % 1440 === 0) {
    const d = minutes / 1440;
    return d === 1 ? "1 jour" : `${d} jours`;
  }
  if (minutes % 60 === 0) {
    const h = minutes / 60;
    return `${h} h`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h ${m} min`;
}

/** Libellé de statut ticket (FR, jamais couleur seule). */
export const ticketStatusLabel: Record<string, string> = {
  ISSUED: "Émis",
  SOLD: "Vendu",
  USED: "Utilisé",
  EXPIRED: "Expiré",
  CANCELLED: "Annulé",
};

/** Tone Badge pour un statut (accompagné du libellé — jamais couleur seule). */
export const ticketStatusTone: Record<
  string,
  "neutral" | "primary" | "success" | "danger" | "warning"
> = {
  ISSUED: "neutral",
  SOLD: "success",
  USED: "primary",
  EXPIRED: "danger",
  CANCELLED: "neutral",
};
