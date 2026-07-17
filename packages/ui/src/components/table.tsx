import * as React from "react";

import { cn } from "../lib/cn";

/**
 * Table — mikconnect.
 *
 * Doctrine DESIGN.md (Ledger Rule + Flat-By-Default) :
 *  - Montants et codes en mono tabulaire (cellule `numeric`).
 *  - Hover de ligne par shift de fond (surface-2), JAMAIS d'ombre.
 *  - Header : casse naturelle, font-medium, text-muted. PAS d'eyebrow
 *    majuscule tracked (No-Eyebrow Rule).
 *  - Bordures tonales (border) uniquement sur les séparateurs horizontaux,
 *    pas de grille complète — respiration de ledger.
 *  - Ligne cliquable : cursor-pointer + hover:bg-surface-2, le focus est
 *    porté par le consommateur (anchor ou button dans la cellule).
 */

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  function Table({ className, ...props }, ref) {
    return (
      <div className="w-full overflow-x-auto">
        <table
          ref={ref}
          className={cn("w-full caption-bottom border-collapse text-sm", className)}
          {...props}
        />
      </div>
    );
  },
);

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(function TableHeader({ className, ...props }, ref) {
  return <thead ref={ref} className={cn("border-b border-border", className)} {...props} />;
});

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(function TableBody({ className, ...props }, ref) {
  return <tbody ref={ref} className={cn(className)} {...props} />;
});

export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(function TableFooter({ className, ...props }, ref) {
  return (
    <tfoot
      ref={ref}
      className={cn("border-t border-border bg-surface font-medium", className)}
      {...props}
    />
  );
});

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(function TableRow({ className, ...props }, ref) {
  return (
    <tr
      ref={ref}
      className={cn(
        "border-b border-border transition-colors duration-150 ease-quint",
        "hover:bg-surface-2",
        "[&:last-child]:border-0",
        "data-[state=selected]:bg-primary-subtle",
        className,
      )}
      {...props}
    />
  );
});

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(function TableHead({ className, ...props }, ref) {
  return (
    <th
      ref={ref}
      className={cn(
        "h-11 px-4 text-left align-middle",
        "text-sm font-medium text-muted",
        "[&:first-child]:pl-4 [&:last-child]:pr-4",
        className,
      )}
      {...props}
    />
  );
});

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  /** Cellule de montant / code : mono tabulaire, alignée à droite par défaut. */
  numeric?: boolean;
}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(
  { className, numeric, ...props },
  ref,
) {
  return (
    <td
      ref={ref}
      className={cn(
        "px-4 py-3 align-middle text-ink",
        "[&:first-child]:pl-4 [&:last-child]:pr-4",
        numeric &&
          "font-mono tabular-nums text-right tracking-tight [font-variant-numeric:tabular-nums]",
        className,
      )}
      {...props}
    />
  );
});

export const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(function TableCaption({ className, ...props }, ref) {
  return <caption ref={ref} className={cn("mt-4 text-sm text-muted", className)} {...props} />;
});
