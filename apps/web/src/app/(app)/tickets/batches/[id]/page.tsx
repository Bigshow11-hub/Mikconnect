"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Copy, Download, FileDown, RefreshCw, toast } from "@mikconnect/ui";

import { ApiError } from "@/lib/api";
import { ticketsApi } from "@/features/tickets/api";
import type { TicketPdfLayout } from "@/features/tickets/types";

const PAGE_SIZE = 100;

export default function TicketBatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [layout, setLayout] = useState<TicketPdfLayout>(
    searchParams.get("layout") === "A4_COMPACT" ? "A4_COMPACT" : "A4_STANDARD",
  );
  const [downloading, setDownloading] = useState(false);
  const batchQuery = useQuery({
    queryKey: ["ticket-batch", id, page],
    queryFn: () => ticketsApi.findBatch(id, PAGE_SIZE, page * PAGE_SIZE),
    enabled: !!id,
  });
  const retry = useMutation({
    mutationFn: () => ticketsApi.retryBatch(id),
    onSuccess: (result) => {
      toast.success(result.ok ? "Routeur synchronisé" : "Synchronisation en attente", {
        description: result.message,
      });
      void queryClient.invalidateQueries({ queryKey: ["ticket-batch", id] });
      void queryClient.invalidateQueries({ queryKey: ["ticket-batches"] });
    },
    onError: (error) =>
      toast.error("Synchronisation impossible", {
        description:
          error instanceof ApiError ? error.message : "Vérifiez le routeur puis réessayez.",
      }),
  });

  async function downloadPdf(openForPrint = false) {
    const batch = batchQuery.data;
    if (!batch) return;
    setDownloading(true);
    try {
      const blob = await ticketsApi.downloadBatchPdf(batch.id, layout);
      const url = URL.createObjectURL(blob);
      if (openForPrint) {
        window.open(url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `mikconnect-lot-${batch.reference}-${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      }
    } catch (error) {
      toast.error("PDF indisponible", {
        description:
          error instanceof Error ? error.message : "Vérifiez votre connexion et réessayez.",
      });
    } finally {
      setDownloading(false);
    }
  }

  async function copyCodes() {
    const batch = batchQuery.data;
    if (!batch) return;
    await navigator.clipboard.writeText(batch.tickets.map((ticket) => ticket.code).join("\n"));
    toast.success("Codes copiés", {
      description: `${batch.tickets.length} code${batch.tickets.length > 1 ? "s" : ""} de cette page copié${batch.tickets.length > 1 ? "s" : ""}.`,
    });
  }

  async function shareBatch() {
    const batch = batchQuery.data;
    if (!batch) return;
    const shareData = {
      title: `Lot ${batch.reference}`,
      text: `${batch.quantity} tickets ${batch.plan.name}`,
      url: window.location.href,
    };
    if (navigator.share) await navigator.share(shareData);
    else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Lien copié");
    }
  }

  if (batchQuery.isLoading) return <BatchDetailSkeleton />;
  if (batchQuery.isError || !batchQuery.data)
    return <BatchDetailError onRetry={() => void batchQuery.refetch()} />;
  const batch = batchQuery.data;
  const pending = batch.tickets.filter((ticket) => ticket.provisioningStatus !== "SYNCED").length;
  const hasNext = batch.offset + batch.tickets.length < batch.total;

  return (
    <div className="flex flex-col gap-6">
      <header className="border-b border-border pb-5">
        <Link href="/tickets/batches" className="text-sm text-muted hover:text-ink hover:underline">
          ← Historique des lots
        </Link>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">
                {batch.cancelledAt ? "Lot annulé" : "Lot prêt à être distribué"}
              </h1>
              {batch.cancelledAt ? (
                <Badge tone="danger">Lot annulé</Badge>
              ) : pending > 0 ? (
                <Badge tone="warning">Synchronisation incomplète</Badge>
              ) : (
                <Badge tone="success">Prêt à distribuer</Badge>
              )}
            </div>
            <p className="mt-2 text-sm text-muted">
              <span className="font-mono font-semibold text-ink">LOT-{batch.reference}</span> ·{" "}
              {batch.quantity} tickets · {batch.plan.name} ·{" "}
              {batch.agent?.user.name ?? "Stock propriétaire"}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <select
              value={layout}
              onChange={(event) => setLayout(event.target.value as TicketPdfLayout)}
              className="h-11 rounded-md border border-border bg-bg px-3 text-sm text-ink"
              aria-label="Format du PDF"
            >
              <option value="A4_STANDARD">A4 standard · 8/page</option>
              <option value="A4_COMPACT">A4 compact · 12/page</option>
            </select>
            <Button onClick={() => void downloadPdf()} disabled={downloading}>
              <Download />
              {downloading ? "Préparation…" : "Télécharger le PDF"}
            </Button>
            <Button variant="outline" onClick={() => void downloadPdf(true)} disabled={downloading}>
              <FileDown />
              Imprimer
            </Button>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Résumé du lot">
        <Summary label="Forfait" value={batch.plan.name} />
        <Summary label="Format des codes" value={`${batch.codeLength} caractères`} mono />
        <Summary
          label="État routeur"
          value={pending > 0 ? `${pending} à synchroniser sur cette page` : "Synchronisé"}
        />
      </section>

      {pending > 0 && !batch.cancelledAt && (
        <section
          className="flex flex-col gap-4 rounded-xl bg-warning-subtle px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          aria-label="Aide à la synchronisation"
        >
          <div>
            <h2 className="text-sm font-semibold text-warning-subtle-foreground">
              Les tickets sont enregistrés, mais le routeur n’a pas tout reçu.
            </h2>
            <p className="mt-1 text-sm text-warning-subtle-foreground">
              Vérifiez que le routeur est en ligne. Vous pouvez relancer sans recréer les codes.
            </p>
          </div>
          <Button variant="outline" onClick={() => retry.mutate()} disabled={retry.isPending}>
            <RefreshCw className={retry.isPending ? "animate-spin" : ""} />
            {retry.isPending ? "Synchronisation…" : "Relancer"}
          </Button>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => void copyCodes()}>
          <Copy />
          Copier les codes affichés
        </Button>
        <Button variant="ghost" onClick={() => void shareBatch()}>
          Partager le lot
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/tickets/new">Créer un autre lot</Link>
        </Button>
      </div>

      <section aria-labelledby="batch-tickets-title">
        <div className="flex items-end justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 id="batch-tickets-title" className="font-semibold text-ink">
              Tickets du lot
            </h2>
            <p className="mt-1 text-sm text-muted">
              Page {page + 1} · {batch.total} tickets au total
            </p>
          </div>
        </div>
        <div className="divide-y divide-border">
          {batch.tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/tickets/${ticket.id}`}
              className="grid min-h-14 gap-2 py-3 transition-colors hover:bg-surface md:grid-cols-[1fr_1fr_1fr] md:items-center md:px-3"
            >
              <span className="font-mono text-sm font-semibold text-ink">{ticket.code}</span>
              <Badge
                tone={
                  ticket.status === "CANCELLED"
                    ? "danger"
                    : ticket.status === "ISSUED"
                      ? "neutral"
                      : "primary"
                }
              >
                {ticket.status === "ISSUED"
                  ? "Disponible"
                  : ticket.status === "SOLD"
                    ? "Vendu"
                    : ticket.status === "USED"
                      ? "Utilisé"
                      : ticket.status === "CANCELLED"
                        ? "Annulé"
                        : "Expiré"}
              </Badge>
              <span className="text-sm text-muted md:text-right">
                {ticket.provisioningStatus === "SYNCED"
                  ? "Routeur synchronisé"
                  : ticket.provisioningStatus === "PENDING"
                    ? "En attente du routeur"
                    : "Synchronisation échouée"}
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            disabled={!hasNext}
            onClick={() => setPage((value) => value + 1)}
          >
            Suivant
          </Button>
        </div>
      </section>

      <section aria-labelledby="batch-events-title" className="border-t border-border pt-5">
        <h2 id="batch-events-title" className="font-semibold text-ink">
          Journal du lot
        </h2>
        <p className="mt-1 text-sm text-muted">
          Création, exports, annulation et opérations de synchronisation.
        </p>
        {batch.events.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Aucun événement enregistré.</p>
        ) : (
          <ol className="mt-4 divide-y divide-border">
            {batch.events.map((event) => (
              <li
                key={event.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{eventLabel(event.action)}</p>
                  <p className="mt-1 text-xs text-muted">
                    {event.actorName ?? "Traitement automatique"}
                  </p>
                </div>
                <time className="font-mono text-xs text-muted" dateTime={event.createdAt}>
                  {new Intl.DateTimeFormat("fr-FR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(event.createdAt))}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function eventLabel(action: string) {
  const labels: Record<string, string> = {
    TICKET_BATCH_CREATED: "Lot créé",
    TICKET_BATCH_PDF_EXPORTED: "PDF téléchargé",
    TICKET_BATCH_PDF_EXPORT_FAILED: "Échec de l’export PDF",
    TICKET_BATCH_CANCELLED: "Tickets invendus annulés",
    TICKET_BATCH_SYNCED: "Synchronisation routeur terminée",
    TICKET_BATCH_SYNC_RETRY_FAILED: "Nouvelle tentative de synchronisation échouée",
  };
  return labels[action] ?? action.replaceAll("_", " ").toLocaleLowerCase("fr-FR");
}

function Summary({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border-y border-border py-4 sm:border-y-0 sm:border-r sm:pr-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-sm font-semibold text-ink ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function BatchDetailSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Chargement du lot">
      <div className="h-8 w-56 animate-pulse rounded bg-surface-3" />
      <div className="h-24 animate-pulse rounded-xl bg-surface-2" />
      <div className="h-72 animate-pulse rounded-xl bg-surface-2" />
    </div>
  );
}

function BatchDetailError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid min-h-72 place-items-center text-center">
      <div>
        <h1 className="text-xl font-semibold text-ink">Lot indisponible</h1>
        <p className="mt-2 text-sm text-muted">
          Nous n’avons pas pu charger ce lot. Vérifiez votre connexion.
        </p>
        <Button className="mt-5" variant="outline" onClick={onRetry}>
          <RefreshCw />
          Réessayer
        </Button>
      </div>
    </div>
  );
}
