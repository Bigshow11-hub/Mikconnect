import * as React from "react";

import { cn } from "../lib/cn";
import { Badge, type BadgeProps } from "./badge";

/**
 * TicketCard — mikconnect (composant signature).
 *
 * Doctrine DESIGN.md :
 *  - Ledger Rule : le code ticket est le hero, en mono tabulaire, large,
 *    sélectionnable et scannable. Le reste est contexte.
 *  - Statut en Badge (jamais couleur seule : icône/dot + libellé).
 *  - Variant "printable" : monochrome, bordures fines, code XL, QR — optimisé
 *    pour la feuille d'impression (PRD US2). Pas de couleur, pas d'ombre.
 *  - Variant "screen" : surface bordée, flat au repos, hover bg-surface-2 si
 *    cliquable.
 *  - Slot QR : le consommateur passe un <QRCode/> (à câbler côté web). Taille
 *    fixe 96px, fond blanc, padding pour le quiet zone.
 *  - Pas de nested cards, pas de side-stripe.
 */

export type TicketStatus = "ISSUED" | "SOLD" | "USED" | "EXPIRED" | "CANCELLED";

interface StatusMap {
  label: string;
  tone: BadgeProps["tone"];
  variant: BadgeProps["variant"];
  dot: boolean;
}

const statusMap: Record<TicketStatus, StatusMap> = {
  ISSUED: { label: "Émis", tone: "neutral", variant: "subtle", dot: true },
  SOLD: { label: "Vendu", tone: "success", variant: "subtle", dot: true },
  USED: { label: "Utilisé", tone: "primary", variant: "subtle", dot: true },
  EXPIRED: { label: "Expiré", tone: "danger", variant: "subtle", dot: true },
  CANCELLED: { label: "Annulé", tone: "neutral", variant: "subtle", dot: true },
};

export interface TicketCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Code ticket alphanumérique — le hero, en mono. */
  code: string;
  /** Nom du forfait, ex. "Express 1 h". */
  planName: string;
  /** Prix pré-formaté, ex. "500". Affiché avec `currency`. */
  price?: string;
  /** Devise, ex. "XOF" ou "GNF". */
  currency?: string;
  /** Durée lisible, ex. "1 h", "1 jour", "7 j". */
  duration?: string;
  /** Statut du ticket. */
  status?: TicketStatus;
  /** Surcharge le libellé de statut auto. */
  statusLabel?: string;
  /** Nom de l'agent (si vendu via agent). */
  agent?: string;
  /** Ligne de pied (ex. "Vendu le 13 juil. — Mariam"). */
  footnote?: React.ReactNode;
  /** Élément QR code (rendu côté web). Taille carrée 96px. */
  qr?: React.ReactNode;
  /** "screen" (défaut) ou "printable" (feuille d'impression). */
  variant?: "screen" | "printable";
}

export const TicketCard = React.forwardRef<HTMLDivElement, TicketCardProps>(function TicketCard(
  {
    className,
    code,
    planName,
    price,
    currency,
    duration,
    status,
    statusLabel,
    agent,
    footnote,
    qr,
    variant = "screen",
    ...props
  },
  ref,
) {
  const printable = variant === "printable";
  const statusBadge =
    status != null ? (
      <Badge
        tone={statusMap[status].tone}
        variant={printable ? "subtle" : statusMap[status].variant}
        dot={statusMap[status].dot}
        className={cn(printable && "border border-current/20 print:border-black/20")}
      >
        {statusLabel ?? statusMap[status].label}
      </Badge>
    ) : null;

  return (
    <div
      ref={ref}
      data-ticket-card
      data-variant={variant}
      className={cn(
        "rounded-lg",
        printable
          ? "border border-black/30 bg-white p-4 text-black print:break-inside-avoid"
          : "border border-border bg-surface p-4 transition-colors duration-150 ease-quint hover:bg-surface-2",
        className,
      )}
      {...props}
    >
      {/* Header : forfait + statut */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span
            className={cn("text-sm font-semibold leading-5", printable ? "text-black" : "text-ink")}
          >
            {planName}
          </span>
          {duration ? <span className="text-xs text-muted leading-5">{duration}</span> : null}
        </div>
        {statusBadge}
      </div>

      {/* Code — le hero, mono, scannable */}
      <div
        className={cn(
          "mt-4 flex select-all items-center justify-center",
          "rounded-md border border-dashed",
          printable ? "border-black/30 py-5" : "border-border-strong/60 bg-bg py-4",
        )}
      >
        <code
          className={cn(
            "font-mono font-semibold tracking-[0.08em] tabular-nums [font-variant-numeric:tabular-nums]",
            printable ? "text-3xl text-black" : "text-2xl text-ink",
          )}
          aria-label={`Code ticket ${code}`}
        >
          {code}
        </code>
      </div>

      {/* Pied : prix + agent + QR */}
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          {price ? (
            <div className="flex items-baseline gap-1">
              <span
                className={cn(
                  "font-mono text-lg font-semibold tabular-nums [font-variant-numeric:tabular-nums]",
                  printable ? "text-black" : "text-ink",
                )}
              >
                {price}
              </span>
              {currency ? <span className="text-xs font-medium text-muted">{currency}</span> : null}
            </div>
          ) : null}
          {agent ? <span className="text-xs text-muted leading-5">Agent : {agent}</span> : null}
          {footnote ? <span className="text-xs text-muted leading-5">{footnote}</span> : null}
        </div>
        {qr ? (
          <div
            className={cn(
              "size-24 shrink-0 rounded-md border border-border-strong/60 bg-white p-1.5",
              "[&_svg]:size-full [&_svg]:h-full [&_svg]:w-full",
            )}
            aria-label="QR code du ticket"
          >
            {qr}
          </div>
        ) : null}
      </div>
    </div>
  );
});

export { statusMap as ticketStatusMap };
