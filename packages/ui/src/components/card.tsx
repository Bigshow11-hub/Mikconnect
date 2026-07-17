import * as React from "react";

import { cn } from "../lib/cn";

/**
 * Card — mikconnect.
 *
 * Doctrine DESIGN.md :
 *  - Surface blanc chaud (--surface), bordure tonale (--border), rounded-lg.
 *  - Flat-By-Default : AUCUNE ombre au repos. L'ombre n'apparaît qu'en réponse
 *    à un état (hover sur une card cliquable, modale). Pour une card cliquable,
 *    utiliser le hover:bg-surface-2 ou hover:border-border-strong, pas d'ombre.
 *  - NEVER NEST CARDS : ne mets pas un <Card> dans un <Card>. Si tu as besoin
 *    de regrouper, utilise des sections bordées ou une liste, pas des cards
 *    empilées. (anti-pattern absolu du skill Impeccable)
 *  - Pas de side-stripe border-left > 1px.
 */

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function Card({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("rounded-lg border border-border bg-surface text-ink", className)}
        {...props}
      />
    );
  },
);

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...props }, ref) {
    return <div ref={ref} className={cn("flex flex-col gap-1.5 p-5", className)} {...props} />;
  },
);

export const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...props }, ref) {
    return (
      <h3
        ref={ref}
        className={cn("text-base font-semibold leading-tight text-ink tracking-tight", className)}
        {...props}
      />
    );
  },
);

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function CardDescription({ className, ...props }, ref) {
  return <p ref={ref} className={cn("text-sm text-muted leading-relaxed", className)} {...props} />;
});

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardContent({ className, ...props }, ref) {
    return <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />;
  },
);

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...props }, ref) {
    return <div ref={ref} className={cn("flex items-center p-5 pt-0", className)} {...props} />;
  },
);
