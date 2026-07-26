import * as React from "react";

import { cn } from "../lib/cn";
import { Label } from "./label";

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
}

/** Relie systématiquement le libellé, l'aide et l'erreur au contrôle. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
  ...props
}: FieldProps) {
  return (
    <div className={cn("grid gap-1.5", className)} {...props}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function fieldDescriptionId(id: string, hasError: boolean, hasHint: boolean) {
  if (hasError) return `${id}-error`;
  if (hasHint) return `${id}-hint`;
  return undefined;
}
