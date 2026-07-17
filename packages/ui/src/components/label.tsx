"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "../lib/cn";

/**
 * Label — mikconnect.
 * Associe un libellé à un champ via htmlFor. Pas d'eyebrow majuscule
 * tracked (No-Eyebrow Rule) : casse naturelle, weight medium.
 */
export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(function Label({ className, ...props }, ref) {
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        "text-sm font-medium text-ink leading-none",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
});
