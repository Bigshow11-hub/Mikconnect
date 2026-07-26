"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  FileDown,
  History,
  Input,
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  RefreshCw,
  Search,
  toast,
} from "@mikconnect/ui";

import { ApiError } from "@/lib/api";
import { ticketsApi } from "@/features/tickets/api";
import type { TicketBatch, TicketPdfLayout } from "@/features/tickets/types";

const PAGE_SIZE = 20;
const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function TicketBatchesPage() {
  const queryClient = useQueryClient();
  const [layout, setLayout] = useState<TicketPdfLayout>("A4_STANDARD");
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"" | "ACTIVE" | "CANCELLED">("");
  const [sync, setSync] = useState<"" | "PENDING" | "SYNCED" | "FAILED">("");
  const [page, setPage] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [batchToCancel, setBatchToCancel] = useState<TicketBatch | null>(null);
  const filters = useMemo(
    () => ({
      q: query.trim() || undefined,
      state: state || undefined,
      provisioningStatus: sync || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [page, query, state, sync],
  );
  const batchesQuery = useQuery({
    queryKey: ["ticket-batches", filters],
    queryFn: () => ticketsApi.findBatches(filters),
  });

  const cancellation = useMutation({
    mutationFn: ticketsApi.cancelBatch,
    onSuccess: (result) => {
      toast.success("Lot conservé et tickets annulés", {
        description: `${result.cancelledTickets} ticket${result.cancelledTickets > 1 ? "s" : ""} invendu${result.cancelledTickets > 1 ? "s" : ""} annulé${result.cancelledTickets > 1 ? "s" : ""}.`,
      });
      setBatchToCancel(null);
      void queryClient.invalidateQueries({ queryKey: ["ticket-batches"] });
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error) =>
      toast.error("Annulation impossible", {
        description:
          error instanceof ApiError ? error.message : "Vérifiez votre connexion et réessayez.",
      }),
  });

  async function download(batch: TicketBatch) {
    setDownloadingId(batch.id);
    try {
      const blob = await ticketsApi.downloadBatchPdf(batch.id, layout);
      downloadBlob(
        blob,
        `mikconnect-lot-${batch.reference}-${new Date().toISOString().slice(0, 10)}.pdf`,
      );
      toast.success("PDF prêt", { description: `Le lot ${batch.reference} a été téléchargé.` });
    } catch (error) {
      toast.error("Téléchargement impossible", {
        description:
          error instanceof Error ? error.message : "Vérifiez votre connexion et réessayez.",
      });
    } finally {
      setDownloadingId(null);
    }
  }

  const data = batchesQuery.data;
  const hasNext = !!data && data.offset + data.items.length < data.total;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted">
            <History className="size-4" aria-hidden="true" />
            Traçabilité des lots
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Historique des lots</h1>
          <p className="mt-1 text-sm text-muted">
            Retrouvez, réimprimez ou annulez les tickets invendus sans effacer l’historique.
          </p>
        </div>
        <Button asChild>
          <Link href="/tickets/new">Générer un lot</Link>
        </Button>
      </header>

      <section className="flex flex-col gap-3" aria-label="Filtres de l’historique">
        <div className="flex flex-col gap-2 md:flex-row">
          <label className="flex h-11 flex-1 items-center gap-2 rounded-md border border-border bg-bg px-3">
            <Search className="size-4 text-muted" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              className="h-auto border-0 bg-transparent px-0 focus-visible:outline-none"
              placeholder="Rechercher une référence de lot"
              aria-label="Rechercher une référence de lot"
            />
          </label>
          <select
            value={state}
            onChange={(event) => {
              setState(event.target.value as typeof state);
              setPage(0);
            }}
            className="h-11 rounded-md border border-border bg-bg px-3 text-sm text-ink"
            aria-label="Filtrer par état du lot"
          >
            <option value="">Tous les lots</option>
            <option value="ACTIVE">Actifs</option>
            <option value="CANCELLED">Annulés</option>
          </select>
          <select
            value={sync}
            onChange={(event) => {
              setSync(event.target.value as typeof sync);
              setPage(0);
            }}
            className="h-11 rounded-md border border-border bg-bg px-3 text-sm text-ink"
            aria-label="Filtrer par synchronisation routeur"
          >
            <option value="">Toute synchronisation</option>
            <option value="PENDING">En attente</option>
            <option value="FAILED">À relancer</option>
            <option value="SYNCED">Synchronisés</option>
          </select>
          <select
            value={layout}
            onChange={(event) => setLayout(event.target.value as TicketPdfLayout)}
            className="h-11 rounded-md border border-border bg-bg px-3 text-sm text-ink"
            aria-label="Format du PDF"
          >
            <option value="A4_STANDARD">A4 standard · 8/page</option>
            <option value="A4_COMPACT">A4 compact · 12/page</option>
          </select>
        </div>
      </section>

      {batchesQuery.isLoading ? (
        <BatchSkeleton />
      ) : batchesQuery.isError ? (
        <QueryError onRetry={() => void batchesQuery.refetch()} />
      ) : !data?.items.length ? (
        <EmptyHistory filtered={!!query || !!state || !!sync} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-bg">
          <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-4 border-b border-border bg-surface-2 px-5 py-3 text-xs font-medium text-muted md:grid">
            <span>Lot</span>
            <span>Forfait</span>
            <span>Tickets</span>
            <span>Routeur</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-border">
            {data.items.map((batch) => (
              <BatchRow
                key={batch.id}
                batch={batch}
                downloading={downloadingId === batch.id}
                onDownload={() => void download(batch)}
                onCancel={() => setBatchToCancel(batch)}
              />
            ))}
          </div>
        </div>
      )}

      {!!data?.total && (
        <div className="flex items-center justify-between gap-3 text-sm text-muted">
          <span>
            {data.total} lot{data.total > 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
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
        </div>
      )}

      <Modal
        open={batchToCancel !== null}
        onOpenChange={(open) => !open && !cancellation.isPending && setBatchToCancel(null)}
      >
        <ModalContent className="max-w-md" hideClose={cancellation.isPending}>
          <ModalHeader>
            <ModalTitle>Annuler les tickets invendus ?</ModalTitle>
            <ModalDescription>
              Le lot restera dans l’historique. Seuls ses tickets encore disponibles seront
              désactivés ; les ventes et usages existants ne changeront pas.
            </ModalDescription>
          </ModalHeader>
          <div className="rounded-lg bg-surface-2 px-4 py-3 font-mono text-sm font-semibold text-ink">
            LOT-{batchToCancel?.reference} · {batchToCancel?.summary.issued ?? 0} disponibles
          </div>
          <ModalFooter>
            <ModalClose asChild>
              <Button variant="outline" disabled={cancellation.isPending}>
                Conserver le lot actif
              </Button>
            </ModalClose>
            <Button
              variant="danger"
              disabled={!batchToCancel || cancellation.isPending}
              onClick={() => batchToCancel && cancellation.mutate(batchToCancel.id)}
            >
              {cancellation.isPending ? "Annulation…" : "Annuler les invendus"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

function BatchRow({
  batch,
  downloading,
  onDownload,
  onCancel,
}: {
  batch: TicketBatch;
  downloading: boolean;
  onDownload: () => void;
  onCancel: () => void;
}) {
  const syncTone =
    batch.summary.failed > 0 ? "danger" : batch.summary.pending > 0 ? "warning" : "success";
  const syncLabel =
    batch.summary.failed > 0
      ? `${batch.summary.failed} à relancer`
      : batch.summary.pending > 0
        ? `${batch.summary.pending} en attente`
        : "Synchronisé";
  return (
    <article className="grid gap-4 px-5 py-4 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto] md:items-center">
      <Link
        href={`/tickets/batches/${batch.id}`}
        className="min-h-11 rounded-md py-1 hover:underline"
      >
        <p className="font-mono text-sm font-semibold text-ink">LOT-{batch.reference}</p>
        <p className="mt-1 text-xs text-muted">
          {dateFormatter.format(new Date(batch.createdAt))} ·{" "}
          {batch.agent?.user.name ?? "Stock propriétaire"}
        </p>
      </Link>
      <div>
        <p className="text-sm font-medium text-ink">{batch.plan.name}</p>
        <p className="mt-1 text-xs text-muted">{batch.quantity} tickets</p>
      </div>
      <div className="flex flex-wrap gap-1.5 text-xs">
        <Badge tone="neutral">{batch.summary.issued} disponibles</Badge>
        {batch.summary.sold + batch.summary.used > 0 && (
          <Badge tone="primary">{batch.summary.sold + batch.summary.used} traités</Badge>
        )}
        {batch.cancelledAt && <Badge tone="danger">Lot annulé</Badge>}
      </div>
      <Badge tone={syncTone}>{syncLabel}</Badge>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <Button variant="outline" size="sm" onClick={onDownload} disabled={downloading}>
          <FileDown aria-hidden="true" />
          {downloading ? "Préparation…" : "PDF"}
        </Button>
        {!batch.cancelledAt && batch.summary.issued > 0 && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Annuler
          </Button>
        )}
      </div>
    </article>
  );
}

function QueryError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center border-y border-border px-4 text-center">
      <h2 className="font-semibold text-ink">Historique indisponible</h2>
      <p className="mt-2 max-w-md text-sm text-muted">
        Nous n’avons pas pu joindre le serveur. Vérifiez votre connexion puis réessayez.
      </p>
      <Button className="mt-5" variant="outline" onClick={onRetry}>
        <RefreshCw />
        Réessayer
      </Button>
    </div>
  );
}

function EmptyHistory({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center border-y border-border py-12 text-center">
      <History className="size-7 text-muted" aria-hidden="true" />
      <h2 className="mt-4 font-semibold text-ink">
        {filtered ? "Aucun lot ne correspond" : "Aucun lot généré"}
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted">
        {filtered
          ? "Modifiez les filtres pour retrouver un autre lot."
          : "Générez votre premier lot pour le télécharger et le suivre ici."}
      </p>
      {!filtered && (
        <Button className="mt-5" asChild>
          <Link href="/tickets/new">Générer le premier lot</Link>
        </Button>
      )}
    </div>
  );
}

function BatchSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-bg"
      role="status"
      aria-label="Chargement de l’historique"
    >
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="flex items-center justify-between border-b border-border px-5 py-5 last:border-0"
        >
          <div className="h-4 w-44 animate-pulse rounded bg-surface-3" />
          <div className="h-11 w-28 animate-pulse rounded bg-surface-3" />
        </div>
      ))}
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
