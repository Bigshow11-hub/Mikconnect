"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge, Button, CheckCircle2, Input, Label, Modal, ModalClose, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle, ModalTrigger, Plus, Ticket, Users, toast } from "@mikconnect/ui";
import { ApiError } from "@/lib/api";
import { agentsApi } from "@/features/agents/api";
import type { Agent } from "@/features/agents/types";

/**
 * /agents — mikconnect.
 *
 * Liste des agents du tenant + ajout (modale). L'owner gère ses agents :
 * commission %, activer/désactiver. Chaque agent est un sous-compte qui
 * peut se connecter et vendre des tickets.
 *
 * Design : liste verticale (pas de cards empilées — une liste bordée),
 * commission en mono (Ledger Rule), badge actif/inactif avec libellé.
 */
export default function AgentsPage() {
  const queryClient = useQueryClient();
  const { data: agents, isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: agentsApi.findAll,
  });

  const [showAdd, setShowAdd] = useState(false);

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { active?: boolean; commissionPercent?: number } }) =>
      agentsApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (err) => {
      toast.error("Modification impossible", {
        description: err instanceof ApiError ? err.message : "Réessayez.",
      });
    },
  });

  function toggleActive(agent: Agent) {
    updateMutation.mutate({
      id: agent.id,
      input: { active: !agent.active },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Agents & revendeurs</h1>
          <p className="text-sm text-muted">Distribuez des lots, suivez les ventes et calculez les commissions.</p>
        </div>
        <Modal open={showAdd} onOpenChange={setShowAdd}>
          <ModalTrigger asChild>
            <Button><Plus /> Ajouter un agent</Button>
          </ModalTrigger>
          <ModalContent>
            <AddAgentForm
              onSuccess={() => {
                setShowAdd(false);
                queryClient.invalidateQueries({ queryKey: ["agents"] });
              }}
            />
          </ModalContent>
        </Modal>
      </div>

      {!!agents?.length && (
        <dl className="flex flex-wrap gap-x-8 gap-y-3 border-y border-border py-4">
          <InlineMetric label="Revendeurs actifs" value={String(agents.filter((agent) => agent.active).length)} />
          <InlineMetric label="Tickets à vendre" value={String(agents.reduce((sum, agent) => sum + agent.availableTicketsCount, 0))} />
          <InlineMetric label="Ventes enregistrées" value={String(agents.reduce((sum, agent) => sum + agent.salesCount, 0))} />
        </dl>
      )}

      {isLoading ? (
        <p className="text-sm text-muted">Chargement des agents…</p>
      ) : !agents || agents.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        <div className="flex flex-col gap-2">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="group flex flex-col gap-4 border-b border-border py-4 last:border-b-0 sm:flex-row sm:items-center"
            >
              <Link
                href={`/agents/${agent.id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted-strong transition-colors group-hover:bg-primary-subtle group-hover:text-primary-subtle-foreground"><Users className="size-[18px]" /></span>
                <span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink">{agent.user.name}</span><span className="block truncate text-xs text-muted">{agent.user.email}</span></span>
              </Link>

              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end gap-0.5">
                  <span className="font-mono text-sm font-medium text-ink">
                    {agent.commissionPercent}%
                  </span>
                  <span className="text-xs text-muted">{agent.availableTicketsCount} à vendre · {agent.salesCount} vendus</span>
                </div>

                <Badge tone={agent.active ? "success" : "neutral"} dot>
                  {agent.active ? "Actif" : "Inactif"}
                </Badge>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleActive(agent)}
                  disabled={updateMutation.isPending}
                >
                  {agent.active ? "Désactiver" : "Activer"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="border-y border-border py-10">
      <div className="mx-auto max-w-2xl text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary-subtle text-primary-subtle-foreground"><Users /></span>
        <h2 className="mt-4 text-lg font-semibold text-ink">Créez votre réseau de revendeurs</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">Chaque agent reçoit son propre accès, uniquement ses tickets et le suivi automatique de sa commission.</p>
      </div>
      <div className="mx-auto mt-7 grid max-w-2xl gap-3 sm:grid-cols-3">
        <EmptyStep icon={<Users />} label="Créez le compte" />
        <EmptyStep icon={<Ticket />} label="Attribuez un lot" />
        <EmptyStep icon={<CheckCircle2 />} label="Suivez les ventes" />
      </div>
      <div className="mt-7 text-center"><Button onClick={onAdd}><Plus /> Ajouter le premier agent</Button></div>
    </div>
  );
}

function EmptyStep({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-3 text-sm font-medium text-ink [&>svg]:size-4 [&>svg]:text-muted">{icon}{label}</div>;
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-ink">{value}</dd></div>;
}

function AddAgentForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    commissionPercent: "5",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await agentsApi.create({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        commissionPercent: parseFloat(form.commissionPercent) || 0,
      });
      toast.success("Agent créé", {
        description: `${form.name} peut maintenant se connecter et vendre des tickets.`,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Création impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ModalHeader>
        <ModalTitle>Ajouter un agent</ModalTitle>
        <ModalDescription>
          Un sous-compte qui peut se connecter, vendre des tickets et toucher sa commission.
        </ModalDescription>
      </ModalHeader>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-name">Nom</Label>
          <Input
            id="agent-name"
            placeholder="Mariam"
            required
            maxLength={80}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            invalid={!!error}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-email">Email</Label>
          <Input
            id="agent-email"
            type="email"
            placeholder="mariam@exemple.com"
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            invalid={!!error}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-password">Mot de passe</Label>
          <Input
            id="agent-password"
            type="password"
            required
            minLength={8}
            placeholder="8 caractères minimum"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            invalid={!!error}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-phone">Téléphone (optionnel)</Label>
          <Input
            id="agent-phone"
            type="tel"
            placeholder="+225 07 00 00 00 00"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-commission">Commission (%)</Label>
          <Input
            id="agent-commission"
            type="number"
            min={0}
            max={100}
            step="0.5"
            required
            value={form.commissionPercent}
            onChange={(e) => set("commissionPercent", e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <ModalFooter>
        <ModalClose asChild>
          <Button variant="outline">Annuler</Button>
        </ModalClose>
        <Button type="submit" disabled={loading}>
          {loading ? "Création…" : "Créer l&rsquo;agent"}
        </Button>
      </ModalFooter>
    </form>
  );
}
