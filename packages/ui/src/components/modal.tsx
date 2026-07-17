"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "../lib/cn";

/**
 * Modal — mikconnect.
 *
 * Doctrine DESIGN.md :
 *  - Flat-By-Default au repos, MAIS la modale est un élément élevé par nature
 *    → --shadow-modal-lift autorisé (la seule ombre structurelle du système).
 *  - Backdrop : fond ink translucide (oklch 0.30 0.018 31 / 0.45), pas de blur
 *    décoratif (glassmorphism interdit). Le blur serait OK techniquement mais
 *    coûteux sur 3G/Android d'entrée de gamme → on reste plat.
 *  - Focus trap natif Radix. Esc ferme. Clic backdrop ferme.
 *  - Animation : fade + slide-from-bottom doux, ease-quint, duration-300.
 *    Pas de bounce/elastic.
 *  - Title + Description obligatoires pour l'a11y (Radix le recommande).
 */

export const Modal = DialogPrimitive.Root;
export const ModalTrigger = DialogPrimitive.Trigger;
export const ModalPortal = DialogPrimitive.Portal;
export const ModalClose = DialogPrimitive.Close;

export const ModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function ModalOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-[oklch(0.30_0.018_31/0.45)]",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        "transition-opacity duration-300 ease-quint",
        className,
      )}
      {...props}
    />
  );
});

export interface ModalContentProps extends React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> {
  /** Désactive la fermeture par clic sur le backdrop (reset confirm, etc.). */
  hideClose?: boolean;
}

export const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ModalContentProps
>(function ModalContent({ className, children, hideClose, ...props }, ref) {
  return (
    <ModalPortal>
      <ModalOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
          "w-full max-w-lg",
          "rounded-lg border border-border bg-bg p-6",
          "shadow-[var(--shadow-modal-lift)]",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-4",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-4",
          "transition-all duration-300 ease-quint",
          "max-h-[calc(100vh-2rem)] overflow-y-auto",
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose ? (
          <DialogPrimitive.Close
            aria-label="Fermer"
            className={cn(
              "absolute right-4 top-4 rounded-md p-1 text-muted",
              "transition-colors duration-150 ease-quint",
              "hover:bg-surface-2 hover:text-ink",
              "focus-visible:outline-none focus-visible:[box-shadow:var(--shadow-focus-ring)]",
            )}
          >
            <X className="size-4" aria-hidden="true" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </ModalPortal>
  );
});

export const ModalHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function ModalHeader({ className, ...props }, ref) {
    return (
      <div ref={ref} className={cn("flex flex-col gap-1.5 pr-8 text-left", className)} {...props} />
    );
  },
);

export const ModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function ModalTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn("text-lg font-semibold text-ink leading-tight tracking-tight", className)}
      {...props}
    />
  );
});

export const ModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function ModalDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn("text-sm text-muted leading-relaxed", className)}
      {...props}
    />
  );
});

export const ModalFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function ModalFooter({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
        {...props}
      />
    );
  },
);
