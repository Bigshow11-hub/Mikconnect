"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge, Button, CheckCircle2, Download, Ticket, toast } from "@mikconnect/ui";
import { agentsApi } from "@/features/agents/api";
import { formatAmount, formatDuration } from "@/features/tickets/format";
import { ticketsApi } from "@/features/tickets/api";

export default function AgentWorkspacePage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["agent-workspace"],
    queryFn: agentsApi.myWorkspace,
  });
  const sellMutation = useMutation({
    mutationFn: agentsApi.sellMyTicket,
    onSuccess: (result) => {
      toast.success("Vente enregistrée", {
        description: `${result.ticket.code} a été comptabilisé dans vos ventes.`,
      });
      queryClient.invalidateQueries({ queryKey: ["agent-workspace"] });
    },
    onError: (error: Error) => toast.error("Vente impossible", { description: error.message }),
  });

  const workspace = query.data;
  const available = workspace?.tickets.filter((ticket) => ticket.status === "ISSUED") ?? [];

  async function downloadTickets() {
    if (!available.length) return;
    try {
      const blob = await ticketsApi.downloadPdf(available.map((ticket) => ticket.id));
      downloadBlob(blob, `mes-tickets-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      toast.error("Téléchargement impossible", { description: error instanceof Error ? error.message : "Réessayez." });
    }
  }

  if (query.isLoading) return <AgentSkeleton />;
  if (!workspace) return <p className="text-sm text-muted">Votre espace revendeur est indisponible.</p>;

  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted">Espace revendeur · {workspace.tenant.name}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-ink sm:text-3xl">
            Bonjour {workspace.user.name.split(" ")[0]},
          </h1>
          <p className="mt-2 text-sm text-muted">Gérez uniquement les tickets qui vous ont été attribués.</p>
        </div>
        <Button variant="outline" onClick={downloadTickets} disabled={!available.length}>
          <Download /> Télécharger mes tickets
        </Button>
      </section>

      <section className="overflow-hidden rounded-[14px] bg-inverse text-inverse-foreground">
        <dl className="grid sm:grid-cols-4">
          <AgentMetric label="Tickets à vendre" value={String(workspace.availableTicketsCount)} />
          <AgentMetric label="Tickets vendus" value={String(workspace.soldTicketsCount)} />
          <AgentMetric label="Montant vendu" value={`${formatAmount(workspace.totalAmount, workspace.tenant.currency)} ${workspace.tenant.currency}`} />
          <AgentMetric label="Ma commission" value={`${formatAmount(workspace.totalCommission, workspace.tenant.currency)} ${workspace.tenant.currency}`} />
        </dl>
      </section>

      <section aria-labelledby="agent-tickets-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="agent-tickets-title" className="text-lg font-semibold text-ink">Tickets disponibles</h2>
            <p className="text-sm text-muted">Remettez le code au client, puis confirmez la vente.</p>
          </div>
          <Badge tone={workspace.active ? "success" : "danger"} dot>{workspace.active ? "Compte actif" : "Compte suspendu"}</Badge>
        </div>

        {!available.length ? (
          <div className="flex flex-col items-center border-y border-border py-12 text-center">
            <span className="grid size-11 place-items-center rounded-xl bg-success-subtle text-success-subtle-foreground"><CheckCircle2 /></span>
            <p className="mt-4 font-medium text-ink">Aucun ticket en attente</p>
            <p className="mt-1 max-w-md text-sm text-muted">Demandez un nouveau lot au propriétaire de la zone.</p>
          </div>
        ) : (
          <div className="divide-y divide-border border-y border-border">
            {available.map((ticketItem) => (
              <article key={ticketItem.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-subtle text-primary-subtle-foreground"><Ticket className="size-[18px]" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-base font-semibold tracking-[0.04em] text-ink">{ticketItem.code}</p>
                  <p className="mt-1 text-xs text-muted">{ticketItem.plan.name} · {formatDuration(ticketItem.plan.durationMinutes)}</p>
                </div>
                <p className="font-mono text-sm font-semibold text-ink">{formatAmount(ticketItem.plan.price, ticketItem.plan.currency)} {ticketItem.plan.currency}</p>
                <Button
                  onClick={() => sellMutation.mutate(ticketItem.id)}
                  disabled={sellMutation.isPending || !workspace.active}
                >
                  Confirmer la vente
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AgentMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-inverse-foreground/10 px-5 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <dt className="text-xs text-inverse-foreground/55">{label}</dt>
      <dd className="mt-2 font-mono text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function AgentSkeleton() {
  return <div className="h-72 animate-pulse rounded-[14px] bg-surface-2" role="status" aria-label="Chargement de l’espace agent" />;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
