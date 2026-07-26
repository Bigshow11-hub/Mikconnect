"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Copy,
  ExternalLink,
  Field,
  Input,
  Link2,
  RefreshCw,
  Trash2,
  toast,
} from "@mikconnect/ui";

import { ApiError } from "@/lib/api";
import { zonesApi } from "@/features/onboarding/api";
import { monitoringLinksApi } from "./api";

export function MonitoringLinksPanel() {
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [includeRevenue, setIncludeRevenue] = useState(true);
  const [includeTicketStats, setIncludeTicketStats] = useState(true);
  const [includeNetwork, setIncludeNetwork] = useState(true);
  const links = useQuery({ queryKey: ["monitoring-links"], queryFn: monitoringLinksApi.list });
  const zones = useQuery({ queryKey: ["zones-with-routers"], queryFn: zonesApi.findAll });
  const create = useMutation({
    mutationFn: monitoringLinksApi.create,
    onSuccess: async (link) => {
      toast.success("Lien de monitoring créé", {
        description: "Il peut être copié et partagé immédiatement.",
      });
      setName("");
      await client.invalidateQueries({ queryKey: ["monitoring-links"] });
      await copyPath(link.publicPath);
    },
    onError: (error) =>
      toast.error("Création impossible", {
        description: error instanceof ApiError ? error.message : "Réessayez.",
      }),
  });
  const revoke = useMutation({
    mutationFn: monitoringLinksApi.revoke,
    onSuccess: async () => {
      toast.success("Lien révoqué");
      await client.invalidateQueries({ queryKey: ["monitoring-links"] });
    },
  });
  const rotate = useMutation({
    mutationFn: monitoringLinksApi.rotate,
    onSuccess: async (link) => {
      toast.success("Nouveau lien généré");
      await client.invalidateQueries({ queryKey: ["monitoring-links"] });
      await copyPath(link.publicPath);
    },
  });

  function handleZone(value: string) {
    setZoneId(value);
    if (value) {
      setIncludeRevenue(false);
      setIncludeTicketStats(false);
      setIncludeNetwork(true);
    }
  }

  async function copyPath(path: string) {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    toast.success("Lien copié");
  }

  return (
    <section aria-labelledby="monitoring-links-title" className="space-y-5">
      <header>
        <div className="flex items-center gap-2">
          <Link2 className="size-5 text-primary" />
          <h2 id="monitoring-links-title" className="text-lg font-semibold text-ink">
            Monitoring partageable
          </h2>
        </div>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
          Créez une vue en lecture seule pour un partenaire ou un technicien. Aucun code, téléphone
          ou nom de client n’est exposé.
        </p>
      </header>

      <form
        className="dashboard-panel p-4 sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate({
            name,
            zoneId: zoneId || undefined,
            expiresInDays,
            includeRevenue,
            includeTicketStats,
            includeNetwork,
          });
        }}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Nom du lien" htmlFor="monitoring-name" required>
            <Input
              id="monitoring-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Technicien de garde"
              required
            />
          </Field>
          <Field
            label="Périmètre"
            htmlFor="monitoring-zone"
            hint={
              zoneId
                ? "Une zone partage uniquement son état réseau."
                : "Toutes les zones de l’entreprise."
            }
          >
            <select
              id="monitoring-zone"
              className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={zoneId}
              onChange={(event) => handleZone(event.target.value)}
            >
              <option value="">Toute l’entreprise</option>
              {zones.data?.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Expiration" htmlFor="monitoring-expiration">
            <select
              id="monitoring-expiration"
              className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={expiresInDays}
              onChange={(event) => setExpiresInDays(Number(event.target.value))}
            >
              <option value={7}>7 jours</option>
              <option value={30}>30 jours</option>
              <option value={90}>90 jours</option>
              <option value={365}>1 an</option>
            </select>
          </Field>
        </div>
        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-ink">Informations partagées</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <MetricToggle
              label="Revenus du mois"
              checked={includeRevenue}
              disabled={!!zoneId}
              onChange={setIncludeRevenue}
            />
            <MetricToggle
              label="État des tickets"
              checked={includeTicketStats}
              disabled={!!zoneId}
              onChange={setIncludeTicketStats}
            />
            <MetricToggle
              label="État du réseau"
              checked={includeNetwork}
              onChange={setIncludeNetwork}
            />
          </div>
        </fieldset>
        {create.error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-danger-subtle px-4 py-3 text-sm text-danger-subtle-foreground"
          >
            {create.error instanceof ApiError
              ? create.error.message
              : "Le lien n’a pas pu être créé."}
          </p>
        )}
        <div className="mt-5 flex justify-end">
          <Button type="submit" className="min-h-11" disabled={!name.trim() || create.isPending}>
            {create.isPending ? "Création…" : "Créer et copier le lien"}
          </Button>
        </div>
      </form>

      {links.isLoading ? (
        <div
          className="h-28 animate-pulse rounded-lg bg-surface-2"
          aria-label="Chargement des liens"
        />
      ) : links.error ? (
        <div className="rounded-lg bg-danger-subtle px-4 py-4 text-sm text-danger-subtle-foreground">
          <p>Impossible de charger les liens.</p>
          <Button variant="outline" className="mt-3" onClick={() => void links.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : !links.data?.length ? (
        <p className="border-y border-border py-7 text-center text-sm text-muted">
          Aucun accès externe n’est actif. Créez un lien lorsque vous devez partager les
          indicateurs.
        </p>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {links.data.map((link) => (
            <article key={link.id} className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-ink">{link.name}</h3>
                  <Badge tone={link.active ? "success" : "neutral"} dot>
                    {link.active ? "Actif" : "Inactif"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {link.zone?.name ?? "Toute l’entreprise"} · expire le{" "}
                  {link.expiresAt
                    ? new Intl.DateTimeFormat("fr-FR").format(new Date(link.expiresAt))
                    : "jamais"}
                  {link.lastAccessedAt
                    ? ` · consulté le ${new Intl.DateTimeFormat("fr-FR").format(new Date(link.lastAccessedAt))}`
                    : " · jamais consulté"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {link.active && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11"
                      onClick={() => void copyPath(link.publicPath)}
                    >
                      <Copy />
                      Copier
                    </Button>
                    <Button variant="outline" size="sm" className="min-h-11" asChild>
                      <a href={link.publicPath} target="_blank" rel="noreferrer">
                        <ExternalLink />
                        Ouvrir
                      </a>
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-11"
                  disabled={rotate.isPending}
                  onClick={() => rotate.mutate(link.id)}
                >
                  <RefreshCw />
                  Régénérer
                </Button>
                {link.active && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-11 text-danger"
                    disabled={revoke.isPending}
                    onClick={() => {
                      if (window.confirm(`Révoquer le lien « ${link.name} » ?`))
                        revoke.mutate(link.id);
                    }}
                  >
                    <Trash2 />
                    Révoquer
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function MetricToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-surface-2"}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-primary"
      />
      {label}
    </label>
  );
}
