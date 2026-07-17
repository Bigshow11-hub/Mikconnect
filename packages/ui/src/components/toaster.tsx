"use client";

import * as React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider as Provider,
  ToastTitle,
  ToastViewport,
} from "./toast";
import { dismissToast, useToasts, type ToastRecord, type ToastTone } from "../lib/toast-store";
import { cn } from "../lib/cn";

/**
 * Toaster — mikconnect.
 * Monté une fois à la racine de l'app (apps/web/src/app/layout.tsx).
 * Lit le store et rend les toasts. Jamais couleur seule : un icône
 * accompagne chaque tone.
 */

const toneIcon: Record<ToastTone, React.ComponentType<{ className?: string }>> = {
  neutral: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

const toneIconClass: Record<ToastTone, string> = {
  neutral: "text-muted",
  success: "text-success-strong",
  warning: "text-warning-strong",
  danger: "text-danger-strong",
};

function ToastRow({ record }: { record: ToastRecord }) {
  const Icon = toneIcon[record.tone];
  return (
    <Toast
      tone={record.tone}
      duration={record.duration}
      onOpenChange={(open) => {
        if (!open) dismissToast(record.id);
      }}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={cn("mt-0.5 size-5 shrink-0", toneIconClass[record.tone])}
          aria-hidden="true"
        />
        <div className="flex-1 space-y-0.5">
          {record.title ? <ToastTitle>{record.title}</ToastTitle> : null}
          {record.description ? <ToastDescription>{record.description}</ToastDescription> : null}
        </div>
      </div>
      <ToastClose />
    </Toast>
  );
}

export function Toaster() {
  const toasts = useToasts();
  return (
    <Provider swipeDirection="down">
      {toasts.map((record) => (
        <ToastRow key={record.id} record={record} />
      ))}
      <ToastViewport />
    </Provider>
  );
}
