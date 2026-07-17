import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

/**
 * Badge — mikconnect.
 *
 * Doctrine DESIGN.md :
 *  - Jamais couleur seule : un badge porte toujours un libellé (children)
 *    et/ou une icône. La couleur est renforcement, pas l'unique signal.
 *  - Style "subtle" par défaut (tint bg + texte foncé) — plus calme, lisible
 *    au soleil, moins agressif qu'un fill saturé. "solid" pour les cas où le
 *    badge doit percer (statut critique dans une liste dense).
 *  - Forme pill (rounded-full) — l'affordance universelle de statut.
 *  - Pas d'eyebrow majuscule tracked : casse naturelle, weight medium.
 *  - warning en solid est un fill PALE → texte sombre (warning-foreground = ink).
 */

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1",
    "rounded-full px-2.5 py-0.5",
    "text-xs font-medium leading-5 whitespace-nowrap",
    "transition-colors duration-200 ease-quint",
    "[&>svg]:size-3.5 [&>svg]:shrink-0",
  ],
  {
    variants: {
      tone: {
        neutral: "",
        success: "",
        warning: "",
        danger: "",
        primary: "",
        accent: "",
      },
      variant: {
        subtle: "",
        solid: "",
      },
    },
    compoundVariants: [
      // neutral
      {
        tone: "neutral",
        variant: "subtle",
        className: "bg-neutral-status-subtle text-neutral-status-subtle-foreground",
      },
      {
        tone: "neutral",
        variant: "solid",
        className: "bg-neutral-status text-neutral-status-foreground",
      },
      // success
      {
        tone: "success",
        variant: "subtle",
        className: "bg-success-subtle text-success-subtle-foreground",
      },
      { tone: "success", variant: "solid", className: "bg-success text-success-foreground" },
      // warning (fill pale en solid → texte sombre)
      {
        tone: "warning",
        variant: "subtle",
        className: "bg-warning-subtle text-warning-subtle-foreground",
      },
      { tone: "warning", variant: "solid", className: "bg-warning text-warning-foreground" },
      // danger
      {
        tone: "danger",
        variant: "subtle",
        className: "bg-danger-subtle text-danger-subtle-foreground",
      },
      { tone: "danger", variant: "solid", className: "bg-danger text-danger-foreground" },
      // primary
      {
        tone: "primary",
        variant: "subtle",
        className: "bg-primary-subtle text-primary-subtle-foreground",
      },
      { tone: "primary", variant: "solid", className: "bg-primary text-primary-foreground" },
      // accent
      {
        tone: "accent",
        variant: "subtle",
        className: "bg-accent-subtle text-accent-subtle-foreground",
      },
      { tone: "accent", variant: "solid", className: "bg-accent text-accent-foreground" },
    ],
    defaultVariants: {
      tone: "neutral",
      variant: "subtle",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  /** Pastille de statut avec un point coloré (renforce sans dépendre de la couleur). */
  dot?: boolean;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, tone, variant, dot, children, ...props },
  ref,
) {
  return (
    <span ref={ref} className={cn(badgeVariants({ tone, variant }), className)} {...props}>
      {dot ? (
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 rounded-full",
            tone === "success" && "bg-success-strong",
            tone === "warning" && "bg-warning-strong",
            tone === "danger" && "bg-danger-strong",
            tone === "neutral" && "bg-neutral-status",
            tone === "primary" && "bg-primary",
            tone === "accent" && "bg-accent",
          )}
        />
      ) : null}
      {children}
    </span>
  );
});

export { badgeVariants };
