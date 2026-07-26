"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Badge, Button, RefreshCw, Router, ShieldCheck } from "@mikconnect/ui";

import { ThemeToggle } from "@/components/theme-toggle";
import { monitoringLinksApi } from "@/features/monitoring-links/api";
import { formatAmount } from "@/features/tickets/format";

export default function PublicMonitoringPage() {
  const { token } = useParams<{ token: string }>();
  const query = useQuery({
    queryKey: ["public-monitoring", token],
    queryFn: () => monitoringLinksApi.publicView(token),
    enabled: !!token,
    refetchInterval: 120_000,
  });

  if (query.isLoading) return <PublicState title="Ouverture du monitoring…" />;
  if (query.error || !query.data)
    return (
      <PublicState
        title="Ce lien n’est plus disponible"
        detail="Il a peut-être expiré ou été révoqué. Demandez un nouveau lien à l’exploitant."
      />
    );
  const view = query.data;

  return (
    <main className="min-h-dvh bg-canvas px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <ShieldCheck className="size-4" />
              Vue sécurisée en lecture seule
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-ink sm:text-3xl">
              {view.name}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {view.tenant.name}
              {view.zone ? ` · ${view.zone.name}` : " · Toutes les zones"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="min-h-11"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              <RefreshCw className={query.isFetching ? "animate-spin" : ""} />
              Actualiser
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <div className="mt-8 space-y-9" aria-live="polite">
          {view.revenue && (
            <section aria-labelledby="public-revenue">
              <h2 id="public-revenue" className="text-base font-semibold text-ink">
                Activité du mois
              </h2>
              <dl className="mt-3 flex flex-wrap divide-y divide-border border-y border-border sm:divide-x sm:divide-y-0">
                <PublicMetric
                  label="Revenus confirmés"
                  value={`${formatAmount(view.revenue.amount, view.tenant.currency)} ${view.tenant.currency}`}
                />
                <PublicMetric label="Ventes confirmées" value={String(view.revenue.sales)} />
              </dl>
            </section>
          )}
          {view.ticketStats && (
            <section aria-labelledby="public-tickets">
              <h2 id="public-tickets" className="text-base font-semibold text-ink">
                État des tickets
              </h2>
              <dl className="mt-3 flex flex-wrap divide-y divide-border border-y border-border">
                {Object.entries(view.ticketStats).map(([status, count]) => (
                  <PublicMetric key={status} label={ticketLabel(status)} value={String(count)} />
                ))}
              </dl>
            </section>
          )}
          {view.network && (
            <section aria-labelledby="public-network">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="public-network" className="text-base font-semibold text-ink">
                  Disponibilité du réseau
                </h2>
                <Badge tone="primary">{view.network.onlineSessions} sessions actives</Badge>
              </div>
              <div className="mt-3 divide-y divide-border border-y border-border">
                {view.network.routers.map((router) => (
                  <div key={router.id} className="flex min-h-16 items-center gap-3 py-3">
                    <span className="grid size-10 place-items-center rounded-lg bg-surface-2 text-muted-strong">
                      <Router className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{router.label}</p>
                      <p className="mt-0.5 text-sm text-muted">
                        Dernier signal{" "}
                        {router.lastSeenAt
                          ? new Intl.DateTimeFormat("fr-FR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            }).format(new Date(router.lastSeenAt))
                          : "indisponible"}
                      </p>
                    </div>
                    <Badge tone={router.status === "ONLINE" ? "success" : "danger"} dot>
                      {router.status === "ONLINE" ? "En ligne" : "Hors ligne"}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <footer className="mt-10 border-t border-border pt-4 text-sm text-muted">
          Mis à jour le{" "}
          {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(
            new Date(view.generatedAt),
          )}
          . Aucune donnée personnelle n’est affichée.
        </footer>
      </div>
    </main>
  );
}

function PublicMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[190px] flex-1 px-4 py-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 font-mono text-xl font-semibold text-ink">{value}</dd>
    </div>
  );
}
function PublicState({ title, detail }: { title: string; detail?: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-5">
      <div className="max-w-md text-center">
        <p className="font-semibold text-ink">{title}</p>
        {detail && <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>}
      </div>
    </main>
  );
}
function ticketLabel(status: string) {
  return (
    (
      {
        ISSUED: "Émis",
        SOLD: "Vendus",
        USED: "Utilisés",
        EXPIRED: "Expirés",
        CANCELLED: "Annulés",
      } as Record<string, string>
    )[status] ?? status
  );
}
