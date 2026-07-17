"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  FileDown,
  History,
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Trash2,
  toast,
} from "@mikconnect/ui";

import { ApiError } from "@/lib/api";
import { ticketsApi } from "@/features/tickets/api";
import type { TicketBatch, TicketPdfLayout } from "@/features/tickets/types";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function TicketBatchesPage() {
  const queryClient = useQueryClient();
  const [layout, setLayout] = useState<TicketPdfLayout>("A4_STANDARD");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<TicketBatch | null>(null);
  const { data: batches, isLoading } = useQuery({
    queryKey: ["ticket-batches"],
    queryFn: ticketsApi.findBatches,
  });

  const deletion = useMutation({
    mutationFn: ticketsApi.deleteBatch,
    onSuccess: () => {
      toast.success("Lot supprimé", { description: "Les tickets non vendus ont été retirés." });
      setBatchToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["ticket-batches"] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
    },
    onError: (error) => toast.error("Suppression impossible", {
      description: error instanceof ApiError ? error.message : "Réessayez.",
    }),
  });

  async function download(batch: TicketBatch) {
    setDownloadingId(batch.id);
    try {
      const blob = await ticketsApi.downloadPdf(batch.tickets.map((ticket) => ticket.id), layout);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `lot-tickets-${batch.id.slice(-6)}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Téléchargement impossible", {
        description: error instanceof Error ? error.message : "Réessayez.",
      });
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted">
            <History className="size-4" aria-hidden="true" />
            Traçabilité des impressions
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Historique des lots</h1>
          <p className="mt-1 text-sm text-muted">Retéléchargez une planche ou supprimez un lot encore invendu.</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="batch-pdf-layout" className="sr-only">Format PDF</label>
          <select
            id="batch-pdf-layout"
            value={layout}
            onChange={(event) => setLayout(event.target.value as TicketPdfLayout)}
            className="h-10 rounded-md border border-border bg-bg px-3 text-sm text-ink focus-visible:border-primary"
          >
            <option value="A4_STANDARD">A4 standard · 8/page</option>
            <option value="A4_COMPACT">A4 compact · 12/page</option>
          </select>
          <Button asChild><Link href="/tickets/new">Nouveau lot</Link></Button>
        </div>
      </header>

      {isLoading ? (
        <BatchSkeleton />
      ) : !batches?.length ? (
        <div className="flex min-h-64 flex-col items-center justify-center border-y border-border py-12 text-center">
          <History className="size-7 text-muted" aria-hidden="true" />
          <h2 className="mt-4 font-semibold text-ink">Aucun lot généré</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">Les prochains lots apparaîtront ici avec leur format et leurs actions.</p>
          <Button className="mt-5" asChild><Link href="/tickets/new">Générer le premier lot</Link></Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-bg">
          <div className="hidden grid-cols-[1.25fr_1fr_.7fr_.8fr_auto] gap-4 border-b border-border bg-surface-2 px-5 py-3 text-xs font-medium text-muted md:grid">
            <span>Lot</span><span>Forfait</span><span>Codes</span><span>État</span><span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-border">
            {batches.map((batch) => {
              const untouched = batch.tickets.every((ticket) => ticket.status === "ISSUED");
              const soldCount = batch.tickets.filter((ticket) => ticket.status !== "ISSUED").length;
              return (
                <article key={batch.id} className="grid gap-4 px-5 py-4 transition-colors hover:bg-surface-2 md:grid-cols-[1.25fr_1fr_.7fr_.8fr_auto] md:items-center">
                  <div>
                    <p className="font-mono text-sm font-semibold text-ink">LOT-{batch.id.slice(-6).toUpperCase()}</p>
                    <p className="mt-1 text-xs text-muted">{dateFormatter.format(new Date(batch.createdAt))} · {batch.agent?.user.name ?? "Stock propriétaire"}</p>
                  </div>
                  <div><p className="text-sm font-medium text-ink">{batch.plan.name}</p><p className="mt-1 text-xs text-muted">{batch.quantity} tickets</p></div>
                  <div><p className="font-mono text-sm font-semibold text-ink">{batch.codeLength}</p><p className="mt-1 text-xs text-muted">caractères</p></div>
                  <div><Badge tone={untouched ? "neutral" : "primary"}>{untouched ? "Disponible" : `${soldCount} traité${soldCount > 1 ? "s" : ""}`}</Badge></div>
                  <div className="flex items-center gap-2 md:justify-end">
                    <Button variant="outline" size="sm" onClick={() => download(batch)} disabled={downloadingId === batch.id}>
                      <FileDown className="size-4" aria-hidden="true" />
                      {downloadingId === batch.id ? "Préparation…" : "PDF"}
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Supprimer le lot ${batch.id.slice(-6)}`} disabled={!untouched} onClick={() => setBatchToDelete(batch)}>
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      <Modal open={batchToDelete !== null} onOpenChange={(open) => !open && !deletion.isPending && setBatchToDelete(null)}>
        <ModalContent className="max-w-md" hideClose={deletion.isPending}>
          <ModalHeader>
            <ModalTitle>Supprimer ce lot ?</ModalTitle>
            <ModalDescription>Cette action retire définitivement tous ses tickets encore invendus. Un lot comportant une vente ne peut pas être supprimé.</ModalDescription>
          </ModalHeader>
          <div className="rounded-lg bg-surface-2 px-4 py-3 font-mono text-sm font-semibold text-ink">
            LOT-{batchToDelete?.id.slice(-6).toUpperCase()} · {batchToDelete?.quantity} tickets
          </div>
          <ModalFooter>
            <ModalClose asChild><Button variant="outline" disabled={deletion.isPending}>Annuler</Button></ModalClose>
            <Button variant="danger" disabled={!batchToDelete || deletion.isPending} onClick={() => batchToDelete && deletion.mutate(batchToDelete.id)}>
              {deletion.isPending ? "Suppression…" : "Supprimer le lot"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

function BatchSkeleton() {
  return <div className="overflow-hidden rounded-xl border border-border bg-bg" aria-label="Chargement de l’historique">
    {[0, 1, 2].map((item) => <div key={item} className="flex items-center justify-between border-b border-border px-5 py-5 last:border-0"><div className="h-4 w-44 animate-pulse rounded bg-surface-3"/><div className="h-9 w-28 animate-pulse rounded bg-surface-3"/></div>)}
  </div>;
}
