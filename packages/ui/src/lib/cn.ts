import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Fusionne des classes Tailwind sans conflit.
 * clsx gère les variantes conditionnelles ; twMerge déduplique les
 * utilitaires Tailwind qui se chevauchent (ex. "p-4 p-6" -> "p-6").
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
