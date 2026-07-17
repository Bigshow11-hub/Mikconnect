"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Badge, Button, Modal, ModalContent, ModalDescription, ModalHeader, ModalTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Ticket, toast } from "@mikconnect/ui";
import { agentsApi, salesApi } from "@/features/agents/api";
import { ticketsApi } from "@/features/tickets/api";
import type { TicketListItem } from "@/features/tickets/types";
import { formatAmount } from "@/features/tickets/format";

/**
 * /agents/:id — mikconnect.
 *
 * Détail d'un agent : infos (nom, email, commission %), résumé des ventes
 * (total vendu, commission due), et liste des ventes avec code ticket +
 * forfait + montant + commission.
 *
 * Design : StatsCards en haut (revenu total, commission due, nombre ventes),
 * tableau des ventes en mono (Ledger Rule).
 */
export default function AgentDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showAssign, setShowAssign] = useState(false);

  const { data: agent, isLoading: agentLoading } = useQuery({
    queryKey: ["agent", params.id],
    queryFn: () => agentsApi.findOne(params.id),
    enabled: !!params.id,
  });

  const { data: sales, isLoading: salesLoading } = useQuery({
    queryKey: ["agent-sales", params.id],
    queryFn: () => salesApi.agentSales(params.id),
    enabled: !!params.id,
  });
  const { data: ticketInventory } = useQuery({
    queryKey: ["unassigned-tickets"],
    queryFn: () => ticketsApi.findAll({ status: "ISSUED", limit: 200 }),
  });

  if (agentLoading) {
    return <p className="text-sm text-muted">Chargement de l&rsquo;agent…</p>;
  }

  if (!agent) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">Agent introuvable.</p>
        <Button asChild variant="outline">
          <Link href="/agents">Retour aux agents</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link href="/agents" className="text-sm text-muted hover:text-ink hover:underline">
            ← Agents
          </Link>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{agent.user.name}</h1>
            <p className="text-sm text-muted">{agent.user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowAssign(true)}>Attribuer des tickets</Button>
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-mono text-sm font-medium text-ink">
                {agent.commissionPercent}%
              </span>
              <span className="text-sm text-muted">Commission</span>
            </div>
            <Badge tone={agent.active ? "success" : "neutral"} dot>
              {agent.active ? "Actif" : "Inactif"}
            </Badge>
          </div>
        </div>
      </div>

      <Modal open={showAssign} onOpenChange={setShowAssign}>
        <ModalContent>
          <AssignTicketsDialog
            agentId={agent.id}
            agentName={agent.user.name}
            tickets={ticketInventory?.tickets.filter((ticket) => !ticket.agent) ?? []}
            onDone={() => {
              setShowAssign(false);
              queryClient.invalidateQueries({ queryKey: ["agent", agent.id] });
              queryClient.invalidateQueries({ queryKey: ["agents"] });
              queryClient.invalidateQueries({ queryKey: ["unassigned-tickets"] });
            }}
          />
        </ModalContent>
      </Modal>

      {/* Résumé — 3 metrics en mono (Ledger Rule) */}
      <div className="grid grid-cols-3 gap-3">
        <Metric
          label="Ventes"
          value={sales ? String(sales.salesCount) : "—"}
        />
        <Metric
          label="Total vendu"
          value={sales ? formatAmount(sales.totalAmount, "XOF") : "—"}
          unit="XOF"
        />
        <Metric
          label="Commission due"
          value={sales ? formatAmount(sales.totalCommission, "XOF") : "—"}
          unit="XOF"
        />
      </div>

      {/* Tableau des ventes */}
      {salesLoading ? (
        <p className="text-sm text-muted">Chargement des ventes…</p>
      ) : !sales || sales.sales.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface px-4 py-8 text-center">
          <p className="text-sm text-muted">Aucune vente pour cet agent.</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-hidden rounded-lg border border-border sm:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Code</TableHead>
                  <TableHead>Forfait</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono">
                      <Link href={`/tickets/${sale.ticket.id}`} className="hover:underline">
                        {sale.ticket.code}
                      </Link>
                    </TableCell>
                    <TableCell>{sale.ticket.plan.name}</TableCell>
                    <TableCell numeric>{formatAmount(sale.amount, "XOF")}</TableCell>
                    <TableCell numeric>{formatAmount(sale.commission, "XOF")}</TableCell>
                    <TableCell className="text-muted">
                      {new Date(sale.createdAt).toLocaleDateString("fr-FR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="flex flex-col gap-2 sm:hidden">
            {sales.sales.map((sale) => (
              <Link
                key={sale.id}
                href={`/tickets/${sale.ticket.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-sm font-medium text-ink">{sale.ticket.code}</span>
                  <span className="text-sm text-muted">{sale.ticket.plan.name}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="font-mono text-sm text-ink">
                    {formatAmount(sale.amount, "XOF")}
                  </span>
                  <span className="font-mono text-sm text-muted">
                    +{formatAmount(sale.commission, "XOF")}
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

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-surface px-3 py-3">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-lg font-semibold text-ink">{value}</span>
        {unit && <span className="text-sm text-muted">{unit}</span>}
      </div>
    </div>
  );
}

function AssignTicketsDialog({ agentId, agentName, tickets, onDone }: { agentId: string; agentName: string; tickets: TicketListItem[]; onDone: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const mutation = useMutation({
    mutationFn: () => agentsApi.assignTickets(agentId, selected),
    onSuccess: (result) => {
      toast.success("Tickets attribués", { description: `${result.assigned} ticket(s) sont maintenant visibles par ${agentName}.` });
      onDone();
    },
    onError: (error: Error) => toast.error("Attribution impossible", { description: error.message }),
  });

  function toggle(ticketId: string) {
    setSelected((current) => current.includes(ticketId) ? current.filter((id) => id !== ticketId) : [...current, ticketId]);
  }

  return (
    <div>
      <ModalHeader>
        <ModalTitle>Attribuer des tickets à {agentName}</ModalTitle>
        <ModalDescription>L’agent les recevra immédiatement dans son espace revendeur.</ModalDescription>
      </ModalHeader>
      {!tickets.length ? (
        <div className="py-8 text-center">
          <p className="text-sm font-medium text-ink">Aucun ticket libre</p>
          <p className="mt-1 text-xs text-muted">Créez un nouveau lot depuis la page Tickets.</p>
        </div>
      ) : (
        <div className="mt-5 max-h-80 divide-y divide-border overflow-y-auto border-y border-border">
          {tickets.map((ticketItem) => (
            <label key={ticketItem.id} className="flex cursor-pointer items-center gap-3 py-3">
              <input type="checkbox" checked={selected.includes(ticketItem.id)} onChange={() => toggle(ticketItem.id)} className="size-4 accent-primary" />
              <span className="grid size-8 place-items-center rounded-md bg-surface-2 text-muted-strong"><Ticket className="size-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-sm font-semibold text-ink">{ticketItem.code}</span>
                <span className="block text-xs text-muted">{ticketItem.plan.name}</span>
              </span>
              <span className="font-mono text-xs text-ink">{formatAmount(ticketItem.plan.price, ticketItem.plan.currency)}</span>
            </label>
          ))}
        </div>
      )}
      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-xs text-muted">{selected.length} sélectionné{selected.length === 1 ? "" : "s"}</p>
        <Button onClick={() => mutation.mutate()} disabled={!selected.length || mutation.isPending}>
          {mutation.isPending ? "Attribution…" : "Confirmer l’attribution"}
        </Button>
      </div>
    </div>
  );
}
