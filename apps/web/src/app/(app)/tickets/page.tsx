"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Badge, Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@mikconnect/ui";
import { plansApi, ticketsApi } from "@/features/tickets/api";
import type { TicketStatus } from "@/features/tickets/types";
import {
  formatAmount,
  ticketStatusLabel,
  ticketStatusTone,
} from "@/features/tickets/format";

/**
 * /tickets — mikconnect.
 *
 * Liste des tickets du tenant avec filtres (statut, forfait) et recherche
 * par code. Tableau sur desktop, cartes sur mobile (responsive structurel,
 * pas fluid typo).
 *
 * Design : header avec titre + CTA « Générer », barre de filtres, tableau
 * mono sur les montants et codes (Ledger Rule). Pas de FOMO, pas d'alertes
 * agressives — les statuts en Badge avec libellé (jamais couleur seule).
 */
const STATUS_FILTERS: { value: TicketStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tous" },
  { value: "ISSUED", label: "Émis" },
  { value: "SOLD", label: "Vendus" },
  { value: "USED", label: "Utilisés" },
  { value: "EXPIRED", label: "Expirés" },
];

export default function TicketsPage() {
  const [status, setStatus] = useState<TicketStatus | "ALL">("ALL");
  const [planId, setPlanId] = useState<string>("ALL");
  const [q, setQ] = useState("");

  const { data: plans } = useQuery({ queryKey: ["plans"], queryFn: plansApi.findAll });

  const filters = useMemo(
    () => ({
      ...(status !== "ALL" ? { status: status as TicketStatus } : {}),
      ...(planId !== "ALL" ? { planId } : {}),
      ...(q.trim() ? { q: q.trim() } : {}),
      limit: 100,
    }),
    [status, planId, q],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", filters],
    queryFn: () => ticketsApi.findAll(filters),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Tickets</h1>
          <p className="text-sm text-muted">
            {data ? `${data.total} ticket${data.total > 1 ? "s" : ""}` : "Chargement…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/tickets/batches">Historique des lots</Link>
          </Button>
          <Button asChild>
            <Link href="/tickets/new">Générer un lot</Link>
          </Button>
        </div>
      </div>

      {/* Filtres — barre horizontale, wrap sur mobile */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors duration-200 ease-quint ${
                status === f.value
                  ? "bg-primary-subtle text-primary-subtle-foreground"
                  : "text-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {plans && plans.length > 0 && (
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="h-9 rounded-md border border-border bg-bg px-3 text-sm text-ink transition-colors duration-200 ease-quint focus-visible:outline-none focus-visible:border-primary focus-visible:[box-shadow:var(--shadow-focus-ring)]"
          >
            <option value="ALL">Tous les forfaits</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        <Input
          type="search"
          placeholder="Rechercher un code…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-[200px]"
        />
      </div>

      {/* Tableau — desktop, cartes — mobile */}
      {isLoading ? (
        <p className="text-sm text-muted">Chargement des tickets…</p>
      ) : !data || data.tickets.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-border sm:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Code</TableHead>
                  <TableHead>Forfait</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                  <TableHead>Créé le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono">{t.code}</TableCell>
                    <TableCell>{t.plan.name}</TableCell>
                    <TableCell>
                      <Badge tone={ticketStatusTone[t.status] ?? "neutral"} dot>
                        {ticketStatusLabel[t.status] ?? t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted">
                      {t.agent?.user.name ?? "—"}
                    </TableCell>
                    <TableCell numeric>
                      {formatAmount(t.plan.price, t.plan.currency)}
                    </TableCell>
                    <TableCell className="text-muted">
                      {new Date(t.createdAt).toLocaleDateString("fr-FR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-2 sm:hidden">
            {data.tickets.map((t) => (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors duration-200 ease-quint hover:bg-surface-2"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-sm font-medium text-ink">{t.code}</span>
                  <span className="text-sm text-muted">{t.plan.name}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <Badge tone={ticketStatusTone[t.status] ?? "neutral"} dot>
                    {ticketStatusLabel[t.status] ?? t.status}
                  </Badge>
                  <span className="font-mono text-sm text-muted">
                    {formatAmount(t.plan.price, t.plan.currency)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface px-4 py-12 text-center">
      <p className="text-sm text-muted">Aucun ticket pour ces filtres.</p>
      <Button asChild variant="outline">
        <Link href="/tickets/new">Générer un premier lot</Link>
      </Button>
    </div>
  );
}
