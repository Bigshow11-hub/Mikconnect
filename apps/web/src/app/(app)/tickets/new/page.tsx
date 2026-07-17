"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge, Button, CheckCircle2, Download, Input, Label, toast } from "@mikconnect/ui";
import { ApiError } from "@/lib/api";
import { agentsApi } from "@/features/agents/api";
import { plansApi, ticketsApi } from "@/features/tickets/api";
import type { GenerateBatchResult, Plan, TicketPdfLayout } from "@/features/tickets/types";
import { formatCurrency, formatDuration } from "@/features/tickets/format";

/**
 * /tickets/new — mikconnect.
 *
 * Génération d'un lot de tickets : choix du forfait, quantité, agent
 * (optionnel). Le backend génère les codes (CSPRNG, alphabet non ambigu),
 * persiste, et pousse vers le routeur (hotspot users).
 *
 * Design : colonne unique max-w-md (plus large que l'auth car tableau de
 * forfaits). Forfaits en liste verticale sélectionnable (pas une grille de
 * cards identiques — anti-ref). Mobile-first, CTA au pouce.
 */
export default function NewTicketsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: plansApi.findAll,
  });
  const { data: agents } = useQuery({ queryKey: ["agents"], queryFn: agentsApi.findAll });

  const [planId, setPlanId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("10");
  const [agentId, setAgentId] = useState("");
  const [codeLength, setCodeLength] = useState<4 | 5 | 6 | 7 | 8>(8);
  const [pdfLayout, setPdfLayout] = useState<TicketPdfLayout>("A4_STANDARD");
  const [generated, setGenerated] = useState<GenerateBatchResult | null>(null);
  const [downloading, setDownloading] = useState(false);

  const mutation = useMutation({
    mutationFn: ticketsApi.generateBatch,
    onSuccess: (result) => {
      toast.success("Lot généré", {
        description: result.push.ok
          ? result.push.message
          : `${result.tickets.length} tickets créés. ${result.push.message}`,
      });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      setGenerated(result);
    },
    onError: (err) => {
      toast.error("Génération impossible", {
        description: err instanceof ApiError ? err.message : "Réessayez.",
      });
    },
  });

  const qty = parseInt(quantity, 10);
  const qtyValid = !isNaN(qty) && qty >= 1 && qty <= 1000;
  const selectedPlan = plans?.find((p) => p.id === planId) ?? null;
  const canSubmit = !!selectedPlan && qtyValid && !mutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlan || !qtyValid) return;
    mutation.mutate({ planId: selectedPlan.id, quantity: qty, agentId: agentId || undefined, codeLength });
  }

  async function downloadPdf() {
    if (!generated) return;
    setDownloading(true);
    try {
      const blob = await ticketsApi.downloadPdf(generated.tickets.map((ticket) => ticket.id), pdfLayout);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `mikconnect-tickets-${new Date().toISOString().slice(0, 10)}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("PDF indisponible", { description: error instanceof Error ? error.message : "Réessayez." });
    } finally {
      setDownloading(false);
    }
  }

  if (plansLoading) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Générer des tickets</h1>
        <p className="text-sm text-muted">Chargement des forfaits…</p>
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Générer des tickets</h1>
        <p className="text-sm text-muted">
          Aucun forfait actif. Les forfaits par défaut sont créés à l&rsquo;inscription.
        </p>
      </div>
    );
  }

  if (generated) {
    const assignedAgent = agents?.find((agent) => agent.id === agentId);
    return (
      <div className="mx-auto max-w-2xl">
        <div className="border-b border-border pb-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-success-subtle text-success-subtle-foreground"><CheckCircle2 /></span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Lot prêt à être distribué</h1>
          <p className="mt-2 text-sm text-muted">
            {generated.tickets.length} tickets sans tirets créés{assignedAgent ? ` et attribués à ${assignedAgent.user.name}` : ""}.
          </p>
        </div>
        <div className="grid gap-4 py-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-sm font-medium text-ink">Feuille A4 prête à imprimer</p>
            <p className="mt-1 text-xs leading-5 text-muted">{pdfLayout === "A4_COMPACT" ? "12 vouchers compacts" : "8 vouchers très lisibles"} par page.</p>
          </div>
          <Button onClick={downloadPdf} disabled={downloading}><Download /> {downloading ? "Préparation…" : "Télécharger le PDF"}</Button>
        </div>
        <div className="flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setGenerated(null)}>Créer un autre lot</Button>
          <Button onClick={() => router.push("/tickets")}>Voir tous les tickets</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-md flex-col gap-6" noValidate>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Générer des tickets</h1>
        <p className="text-sm text-muted">
          Choisissez un forfait et la quantité. Les codes seront poussés au routeur.
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-ink">Longueur du code</legend>
        <p className="mt-1 text-xs text-muted">Longueur totale, sans préfixe imposé. 8 caractères est recommandé.</p>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {([4, 5, 6, 7, 8] as const).map((length) => (
            <label key={length} className={`cursor-pointer rounded-lg border px-3 py-3 text-center transition-colors ${codeLength === length ? "border-primary bg-primary-subtle text-primary-subtle-foreground" : "border-border bg-bg text-muted-strong hover:bg-surface-2"}`}>
              <input className="sr-only" type="radio" name="code-length" value={length} checked={codeLength === length} onChange={() => setCodeLength(length)} />
              <span className="block font-mono text-sm font-semibold">{length}</span>
              <span className="mt-1 block text-[11px]">{length === 8 ? "Recommandé" : "caractères"}</span>
            </label>
          ))}
        </div>
        {codeLength <= 5 && (
          <p className="mt-2 rounded-md bg-warning-subtle px-3 py-2 text-xs text-warning-subtle-foreground">
            Format court : utilisez-le seulement pour de petits lots afin de limiter les collisions.
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-ink">Format d’impression</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {([
            { value: "A4_STANDARD", title: "A4 standard", detail: "8 tickets · meilleure lisibilité" },
            { value: "A4_COMPACT", title: "A4 compact", detail: "12 tickets · moins de papier" },
          ] as const).map((format) => (
            <label key={format.value} className={`cursor-pointer rounded-lg border px-4 py-3 transition-colors ${pdfLayout === format.value ? "border-primary bg-primary-subtle" : "border-border bg-bg hover:bg-surface-2"}`}>
              <input className="sr-only" type="radio" name="pdf-layout" value={format.value} checked={pdfLayout === format.value} onChange={() => setPdfLayout(format.value)} />
              <span className="block text-sm font-semibold text-ink">{format.title}</span>
              <span className="mt-1 block text-xs text-muted">{format.detail}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {!!agents?.length && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-assignment">Attribuer le lot</Label>
          <select
            id="agent-assignment"
            value={agentId}
            onChange={(event) => setAgentId(event.target.value)}
            className="h-11 rounded-md border border-border bg-bg px-3 text-sm text-ink transition-colors focus-visible:border-primary"
          >
            <option value="">Stock du propriétaire</option>
            {agents.filter((agent) => agent.active).map((agent) => (
              <option key={agent.id} value={agent.id}>{agent.user.name} · {agent.commissionPercent}%</option>
            ))}
          </select>
          <p className="text-xs text-muted">L’agent retrouvera immédiatement ces tickets dans son espace revendeur.</p>
        </div>
      )}

      {/* Forfaits — liste verticale sélectionnable, pas une grille de cards */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink leading-none">Forfait</legend>
        {plans.map((plan) => (
          <PlanOption
            key={plan.id}
            plan={plan}
            selected={planId === plan.id}
            onSelect={() => setPlanId(plan.id)}
          />
        ))}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="quantity">Quantité</Label>
        <Input
          id="quantity"
          type="number"
          min={1}
          max={1000}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          invalid={!qtyValid && quantity !== ""}
        />
        <p className="text-sm text-muted">1 à 1000 tickets par lot.</p>
      </div>

      {selectedPlan && qtyValid && (
        <div className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3">
          <span className="text-sm text-muted">Montant total</span>
          <span className="font-mono text-sm font-medium text-ink">
            {formatCurrency(selectedPlan.price * qty, selectedPlan.currency)}
          </span>
        </div>
      )}

      <Button type="submit" size="lg" disabled={!canSubmit}>
        {mutation.isPending ? "Génération…" : "Générer le lot"}
      </Button>

      <Link href="/tickets" className="text-sm text-muted hover:text-ink hover:underline">
        Voir tous les tickets
      </Link>
    </form>
  );
}

function PlanOption({
  plan,
  selected,
  onSelect,
}: {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border px-4 py-3 transition-colors duration-200 ease-quint ${
        selected
          ? "border-primary bg-primary-subtle"
          : "border-border bg-bg hover:bg-surface-2"
      }`}
    >
      <div className="flex flex-col gap-0.5">
        <span className={`text-sm font-medium ${selected ? "text-primary-subtle-foreground" : "text-ink"}`}>
          {plan.name}
        </span>
        <span className="text-sm text-muted">{formatDuration(plan.durationMinutes)}</span>
      </div>
      <div className="flex items-center gap-2">
        {plan.dataLimitMb && <Badge tone="neutral">{plan.dataLimitMb} Mo</Badge>}
        <span className="font-mono text-sm font-medium text-ink">
          {formatCurrency(plan.price, plan.currency)}
        </span>
      </div>
      <input type="radio" name="plan" checked={selected} onChange={onSelect} className="sr-only" />
    </label>
  );
}
