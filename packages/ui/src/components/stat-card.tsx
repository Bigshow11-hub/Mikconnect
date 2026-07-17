import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { cn } from "../lib/cn";
import { Badge } from "./badge";

/**
 * StatCard — mikconnect.
 *
 * Doctrine DESIGN.md :
 *  - Le revenu d'abord : la metric est le hero, le label est le contexte.
 *    Label au-dessus (small, muted, casse naturelle), nombre en mono
 *    tabulaire dessous (font-mono, ~text-3xl, semibold).
 *  - PAS la hero-metric template SaaS (big number + small label + supporting
 *    stats cluster + gradient accent). Ici : un nombre, un label, optionnellement
 *    une tendance inline et une caption. Point.
 *  - PAS d'icône décorative dans le coin (le cliché stat-card-with-corner-icon).
 *  - PAS de nested cards. Surface bordée tonale, flat au repos.
 *  - Montant formaté par le consommateur via Intl.NumberFormat (XOF/GNF).
 *    StatCard est presentational : value est une string pré-formatée.
 */

export interface StatCardTrend {
  /** Libellé court de la tendance, ex. "+12 %" ou "3 aujourd'hui". */
  value: string;
  direction: "up" | "down" | "flat";
  /** Ton sémantique. défaut : up→success, down→danger, flat→neutral. */
  tone?: "success" | "danger" | "warning" | "neutral";
}

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Contexte de la metric, ex. "Revenu du jour". */
  label: string;
  /** Valeur pré-formatée (ex. "125 500" ou "47"). Affichée en mono. */
  value: React.ReactNode;
  /** Unité monétaire ou unité courte, ex. "XOF" ou "tickets". Affichée plus petit après la valeur. */
  unit?: string;
  /** Tendance inline (optionnel). Pas un cluster de stats. */
  trend?: StatCardTrend;
  /** Ligne de caption sous la valeur (optionnel). */
  caption?: React.ReactNode;
}

const trendIcon = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
} as const;

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(function StatCard(
  { className, label, value, unit, trend, caption, ...props },
  ref,
) {
  const TrendIcon = trend ? trendIcon[trend.direction] : null;
  const trendTone =
    trend?.tone ??
    (trend?.direction === "up" ? "success" : trend?.direction === "down" ? "danger" : "neutral");

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-border bg-surface p-5",
        "flex flex-col gap-2",
        className,
      )}
      {...props}
    >
      <span className="text-sm font-medium text-muted leading-5">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-mono text-3xl font-semibold leading-none tracking-tight text-ink",
            "tabular-nums [font-variant-numeric:tabular-nums]",
          )}
        >
          {value}
        </span>
        {unit ? <span className="text-sm font-medium text-muted">{unit}</span> : null}
      </div>
      {trend && TrendIcon ? (
        <div className="flex items-center gap-1.5">
          <Badge tone={trendTone} className="gap-1">
            <TrendIcon className="size-3" aria-hidden="true" />
            {trend.value}
          </Badge>
          {caption ? <span className="text-xs text-muted leading-5">{caption}</span> : null}
        </div>
      ) : caption ? (
        <span className="text-xs text-muted leading-5">{caption}</span>
      ) : null}
    </div>
  );
});
