"use client";

import { useSyncExternalStore } from "react";

/**
 * Toast store — mikconnect.
 *
 * Store minimal sans dépendance externe (pas de zustand dans packages/ui).
 * useSyncExternalStore pour la réactivité React 18.
 *
 * Imperative API :
 *   import { toast } from "@mikconnect/ui";
 *   toast.success("Ticket vendu", { description: "Code ABC123 — 500 XOF" });
 *   toast.error("Écart détecté", { description: "Agent Mariam : 3 tickets non soldés" });
 *
 * Le toast est calme par défaut (duration 5s, pas d'alerte agressive).
 */

export type ToastTone = "neutral" | "success" | "warning" | "danger";

export interface ToastRecord {
  id: string;
  title?: string;
  description?: string;
  tone: ToastTone;
  duration?: number;
  actionLabel?: string;
}

export interface ToastInput {
  title?: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
  actionLabel?: string;
}

let counter = 0;
function uid(): string {
  counter += 1;
  return `toast-${Date.now().toString(36)}-${counter}`;
}

type Listener = () => void;
const listeners = new Set<Listener>();
let toasts: ToastRecord[] = [];

function emit(): void {
  toasts = [...toasts];
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ToastRecord[] {
  return toasts;
}

function dismiss(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function push(input: ToastInput): string {
  const id = uid();
  const record: ToastRecord = {
    id,
    title: input.title,
    description: input.description,
    tone: input.tone ?? "neutral",
    duration: input.duration ?? 5000,
    actionLabel: input.actionLabel,
  };
  toasts = [...toasts, record];
  emit();
  return id;
}

interface ToastApi {
  (input: ToastInput): string;
  success: (title: string, options?: Omit<ToastInput, "title" | "tone">) => string;
  warning: (title: string, options?: Omit<ToastInput, "title" | "tone">) => string;
  error: (title: string, options?: Omit<ToastInput, "title" | "tone">) => string;
  neutral: (title: string, options?: Omit<ToastInput, "title" | "tone">) => string;
  dismiss: (id: string) => void;
}

export const toast: ToastApi = Object.assign((input: ToastInput) => push(input), {
  success: (title: string, options?: Omit<ToastInput, "title" | "tone">) =>
    push({ title, tone: "success", ...options }),
  warning: (title: string, options?: Omit<ToastInput, "title" | "tone">) =>
    push({ title, tone: "warning", ...options }),
  error: (title: string, options?: Omit<ToastInput, "title" | "tone">) =>
    push({ title, tone: "danger", ...options }),
  neutral: (title: string, options?: Omit<ToastInput, "title" | "tone">) =>
    push({ title, tone: "neutral", ...options }),
  dismiss,
});

export function useToasts(): ToastRecord[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function dismissToast(id: string): void {
  dismiss(id);
}
