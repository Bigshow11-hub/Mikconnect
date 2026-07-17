"use client";

import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "../lib/cn";

/**
 * Toast primitives — mikconnect.
 *
 * Doctrine DESIGN.md :
 *  - Calme : pas d'alerte agressive, transitions douces, ombre discrète.
 *  - Flat-by-default au repos ; --shadow-toast seulement (léger) car le toast
 *    est un élément flottant par nature (échappe au flat du contenu).
 *  - Bordure tonale + fond bg. Tone par accent de bordure gauche ? NON —
 *    side-stripe interdit. On teinte le fond via tint subtle + un dot coloré.
 *  - Jamais couleur seule : dot coloré + libellé.
 *  - Close button accessible (aria-label).
 */

export const ToastProvider = ToastPrimitives.Provider;

export const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(function ToastViewport({ className, ...props }, ref) {
  return (
    <ToastPrimitives.Viewport
      ref={ref}
      className={cn(
        "fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4",
        "sm:max-w-sm",
        "outline-none",
        className,
      )}
      {...props}
    />
  );
});

const toastVariants = cva(
  [
    "group pointer-events-auto relative flex w-full items-start gap-3",
    "rounded-lg border p-4 pr-8",
    "bg-bg text-ink",
    "shadow-[var(--shadow-toast)]",
    "transition-all duration-300 ease-quint",
    "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-2",
    "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-2",
    "data-[swipe=move]:translate-y-0 data-[swipe=move]:transition-none",
    "data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-bottom",
  ],
  {
    variants: {
      tone: {
        neutral: "border-border",
        success: "border-success/30 bg-success-subtle/40",
        warning: "border-warning-strong/30 bg-warning-subtle/40",
        danger: "border-danger/30 bg-danger-subtle/40",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export interface ToastProps
  extends
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>,
    VariantProps<typeof toastVariants> {}

export const Toast = React.forwardRef<React.ElementRef<typeof ToastPrimitives.Root>, ToastProps>(
  function Toast({ className, tone, ...props }, ref) {
    return (
      <ToastPrimitives.Root
        ref={ref}
        className={cn(toastVariants({ tone }), className)}
        {...props}
      />
    );
  },
);

export const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(function ToastTitle({ className, ...props }, ref) {
  return (
    <ToastPrimitives.Title
      ref={ref}
      className={cn("text-sm font-semibold text-ink", className)}
      {...props}
    />
  );
});

export const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(function ToastDescription({ className, ...props }, ref) {
  return (
    <ToastPrimitives.Description
      ref={ref}
      className={cn("text-sm text-muted leading-relaxed", className)}
      {...props}
    />
  );
});

export const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(function ToastClose({ className, ...props }, ref) {
  return (
    <ToastPrimitives.Close
      ref={ref}
      aria-label="Fermer"
      className={cn(
        "absolute right-2 top-2 rounded-md p-1 text-muted",
        "transition-colors duration-150 ease-quint",
        "hover:bg-surface-2 hover:text-ink",
        "focus-visible:outline-none focus-visible:[box-shadow:var(--shadow-focus-ring)]",
        className,
      )}
      {...props}
    >
      <X className="size-4" aria-hidden="true" />
    </ToastPrimitives.Close>
  );
});

export const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(function ToastAction({ className, ...props }, ref) {
  return (
    <ToastPrimitives.Action
      ref={ref}
      className={cn(
        "inline-flex h-8 items-center rounded-md border border-border-strong bg-bg px-3",
        "text-sm font-medium text-ink",
        "transition-colors duration-150 ease-quint",
        "hover:bg-surface-2",
        "focus-visible:outline-none focus-visible:[box-shadow:var(--shadow-focus-ring)]",
        className,
      )}
      {...props}
    />
  );
});

export { toastVariants };
