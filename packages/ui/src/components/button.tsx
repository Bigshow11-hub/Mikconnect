"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

/**
 * Button — mikconnect.
 *
 * Doctrine DESIGN.md :
 *  - Text-on-fill : blanc forcé sur primary/secondary (L 0.42-0.78 + chroma ≥ 0.08).
 *  - Flat au repos, réponse d'état au hover/active par changement de fond.
 *  - Transition background-color/color/border-color, duration-200 ease-quint.
 *    Pas de transform (pas de translateY "lift"), pas de bounce/elastic.
 *  - Focus via :focus-visible (anneau primary + offset) géré dans theme.css base layer.
 *  - rayon md (6px) — ledger légèrement serré.
 */

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "whitespace-nowrap rounded-md font-medium",
    "transition-colors duration-200 ease-quint",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&>svg]:shrink-0 [&>svg]:size-[1.25em]",
    "select-none",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-primary text-primary-foreground",
          "hover:bg-primary-hover",
          "active:bg-primary-active",
        ],
        secondary: [
          "bg-accent text-accent-foreground",
          "hover:bg-accent-hover",
          "active:bg-accent-active",
        ],
        outline: [
          "border border-border-strong bg-bg text-ink",
          "hover:bg-surface-2 hover:text-ink",
          "active:bg-surface-3",
        ],
        ghost: [
          "bg-transparent text-ink",
          "hover:bg-surface-2 hover:text-ink",
          "active:bg-surface-3",
        ],
        subtle: [
          "bg-primary-subtle text-primary-subtle-foreground",
          "hover:bg-primary-subtle/80",
          "active:bg-primary-subtle/60",
        ],
        danger: [
          "bg-danger text-danger-foreground",
          "hover:bg-danger-strong",
          "active:bg-danger-strong",
        ],
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "size-10 p-0",
        "icon-sm": "size-9 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Fusionne le slot avec l'enfant (ex. <Button asChild><a/></Button>). */
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  // Évite le type="submit" par défaut quand asChild (Sinon Slot hurle).
  const resolvedType = asChild ? undefined : (type ?? "button");
  return (
    <Comp
      ref={ref}
      type={resolvedType}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});

export { buttonVariants };
