"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Badge,
  Button,
  CheckCircle2,
  Clock3,
  Input,
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  RefreshCw,
  Router,
  WifiOff,
  toast,
} from "@mikconnect/ui";

import { ApiError } from "@/lib/api";
import { networkOperationsApi } from "./api";
import type { NetworkIssue } from "./types";

const CONFIRMATION = "CORRIGER L'HEURE";

export function NetworkDiagnosticsPanel() {
  const client = useQueryClient();
  const [repair, setRepair] = useState<{ id: string; label: string } | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const query = useQuery({
    queryKey: ["network-operations"],
    queryFn: networkOperationsApi.overview,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  const fixTimezone = useMutation({
    mutationFn: (routerId: string) => networkOperationsApi.fixTimezone(routerId),
    onSuccess: async (result) => {
      toast.success("Horloge du routeur corrigée", { description: result.message });
      setRepair(null);
      setConfirmation("");
      await client.invalidateQueries({ queryKey: ["network-operations"] });
    },
    onError: (error) =>
      toast.error("Correction impossible", {
        description:
          error instanceof ApiError ? error.message : "Réessayez lorsque le routeur est en ligne.",
      }),
  });

  if (query.isLoading) return <NetworkSkeleton />;
  if (query.error || !query.data) {
    return (
      <StatePanel
        title="Le diagnostic réseau n’est pas disponible"
        detail={query.error instanceof ApiError ? query.error.message : "L’API n’a pas répondu."}
        action={
          <Button variant="outline" onClick={() => void query.refetch()}>
            Réessayer
          </Button>
        }
      />
    );
  }

  const { summary } = query.data;
  const issueCount = query.data.routers.reduce((sum, router) => sum + router.issues.length, 0);

  return (
    <>
      <section aria-labelledby="network-diagnostics-title" className="space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="network-diagnostics-title" className="text-lg font-semibold text-ink">
                Diagnostic réseau
              </h2>
              <Badge tone={issueCount ? "warning" : "success"} dot>
                {issueCount
                  ? `${issueCount} point${issueCount > 1 ? "s" : ""} à traiter`
                  : "Tout est stable"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted">
              Contrôle en lecture seule de RouterOS, des tickets en attente et des opérations de
              reprise.
            </p>
          </div>
          <Button
            variant="outline"
            className="min-h-11"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <RefreshCw className={query.isFetching ? "animate-spin" : ""} />
            Actualiser
          </Button>
        </header>

        <dl className="dashboard-panel flex flex-wrap divide-y divide-border overflow-hidden sm:divide-x sm:divide-y-0">
          <Summary label="Routeurs joignables" value={`${summary.online}/${summary.routers}`} />
          <Summary label="Tickets en attente" value={String(summary.pendingTickets)} />
          <Summary label="Synchronisations échouées" value={String(summary.failedTickets)} />
          <Summary label="Opérations à reprendre" value={String(summary.pendingOperations)} />
        </dl>

        {query.data.routers.length === 0 ? (
          <StatePanel
            title="Aucun routeur configuré"
            detail="Ajoutez une zone et son routeur pour lancer le diagnostic."
          />
        ) : (
          <div className="divide-y divide-border border-y border-border">
            {query.data.routers.map((router) => (
              <article key={router.id} className="py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`grid size-11 shrink-0 place-items-center rounded-lg ${router.status === "ONLINE" ? "bg-success-subtle text-success-strong" : "bg-danger-subtle text-danger"}`}
                    >
                      {router.status === "ONLINE" ? (
                        <Router className="size-5" />
                      ) : (
                        <WifiOff className="size-5" />
                      )}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-ink">{router.label}</h3>
                        <Badge tone={router.status === "ONLINE" ? "success" : "danger"} dot>
                          {router.status === "ONLINE" ? "En ligne" : "Hors ligne"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {router.zone?.name ?? "Sans zone"}
                        {router.diagnostics.board ? ` · ${router.diagnostics.board}` : ""}
                        {router.diagnostics.version
                          ? ` · RouterOS ${router.diagnostics.version}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  {router.diagnostics.ok && (
                    <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      <Detail label="Actifs" value={String(router.diagnostics.activeUsers)} />
                      <Detail
                        label="Tickets RouterOS"
                        value={String(router.diagnostics.hotspotUsers)}
                      />
                      <Detail label="Fuseau" value={router.diagnostics.timezoneName ?? "Inconnu"} />
                      <Detail label="Uptime" value={router.diagnostics.uptime ?? "—"} />
                    </dl>
                  )}
                </div>

                {router.issues.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {router.issues.map((issue) => (
                      <IssueRow
                        key={issue.code}
                        issue={issue}
                        onRepair={() => {
                          setRepair({ id: router.id, label: router.label });
                          setConfirmation("");
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-2 text-sm text-success-strong">
                    <CheckCircle2 className="size-4" /> Aucun problème détecté.
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={repair !== null}
        onOpenChange={(open) => !open && !fixTimezone.isPending && setRepair(null)}
      >
        <ModalContent className="max-w-md" hideClose={fixTimezone.isPending}>
          <ModalHeader>
            <span className="mb-2 grid size-11 place-items-center rounded-lg bg-warning-subtle text-warning-subtle-foreground">
              <Clock3 className="size-5" />
            </span>
            <ModalTitle>Corriger l’horloge de {repair?.label} ?</ModalTitle>
            <ModalDescription>
              Mikconnect désactivera la détection automatique et appliquera le fuseau configuré pour
              votre pays. Cette intervention est journalisée.
            </ModalDescription>
          </ModalHeader>
          <label
            className="mt-5 block text-sm font-medium text-ink"
            htmlFor="timezone-confirmation"
          >
            Saisissez <span className="font-mono">{CONFIRMATION}</span>
          </label>
          <Input
            id="timezone-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
          />
          <ModalFooter>
            <ModalClose asChild>
              <Button variant="outline" disabled={fixTimezone.isPending}>
                Annuler
              </Button>
            </ModalClose>
            <Button
              disabled={confirmation !== CONFIRMATION || fixTimezone.isPending}
              onClick={() => repair && fixTimezone.mutate(repair.id)}
            >
              {fixTimezone.isPending ? "Correction…" : "Corriger l’horloge"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

function IssueRow({ issue, onRepair }: { issue: NetworkIssue; onRepair: () => void }) {
  const critical = issue.severity === "CRITICAL";
  return (
    <div
      className={`flex flex-col gap-3 rounded-lg px-4 py-3 sm:flex-row sm:items-center ${critical ? "bg-danger-subtle text-danger-subtle-foreground" : "bg-warning-subtle text-warning-subtle-foreground"}`}
      role={critical ? "alert" : "status"}
    >
      <AlertTriangle className="size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{issue.title}</p>
        <p className="mt-0.5 text-sm leading-5 opacity-80">{issue.detail}</p>
      </div>
      {issue.action === "FIX_TIMEZONE" && (
        <Button variant="outline" size="sm" className="min-h-11 shrink-0" onClick={onRepair}>
          Corriger
        </Button>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[170px] flex-1 px-4 py-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 font-mono text-xl font-semibold text-ink">{value}</dd>
    </div>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 font-mono text-ink">{value}</dd>
    </div>
  );
}
function StatePanel({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="dashboard-panel px-4 py-8 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-muted">{detail}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
function NetworkSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-label="Chargement du diagnostic">
      <div className="h-16 rounded-lg bg-surface-2" />
      <div className="h-28 rounded-lg bg-surface-2" />
      <div className="h-48 rounded-lg bg-surface-2" />
    </div>
  );
}
