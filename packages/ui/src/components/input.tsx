import * as React from "react";

import { cn } from "../lib/cn";

/**
 * Input — mikconnect.
 *
 * Doctrine DESIGN.md :
 *  - Flat au repos : fond bg, bordure tonale border. Pas d'ombre.
 *  - Focus : bordure primary + anneau primary translucide (via :focus-visible
 *    du base layer + ring spécifique ci-dessous).
 *  - Placeholder en --muted (≥4.5:1, Sunlight Rule).
 *  - Error : bordure danger + aria-invalid. Le message d'erreur est porté par
 *    le composant Field (à venir) ou par le consommateur via aria-describedby.
 *  - Disabled : fond surface, texte muted, opacity.
 *  - Hauteur 10 (40px) = touch target mobile minimum confortable.
 */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Visée error state : ajoute aria-invalid + bordure danger. */
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, type = "text", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex h-10 w-full rounded-md border bg-bg px-3",
        "text-base text-ink",
        "placeholder:text-muted",
        "transition-colors duration-200 ease-quint",
        "focus-visible:outline-none focus-visible:border-primary focus-visible:[box-shadow:var(--shadow-focus-ring)]",
        "disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted disabled:opacity-70",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink",
        "selection:bg-primary-subtle selection:text-primary-subtle-foreground",
        // taille de police ≥16px sur iOS pour éviter le zoom au focus
        "[font-size:16px] md:text-sm",
        invalid
          ? "border-danger focus-visible:border-danger focus-visible:[box-shadow:0_0_0_2px_var(--ring-offset),0_0_0_4px_var(--danger)]"
          : "border-border",
        className,
      )}
      {...props}
    />
  );
});
