"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as m from "motion/react-m";
import {
  Activity,
  Badge,
  Button,
  Clock3,
  Download,
  Radio,
  RefreshCw,
  Search,
  ShieldBan,
  Unplug,
  Upload,
  UserRound,
  toast,
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@mikconnect/ui";
import { ApiError } from "@/lib/api";
import { routerMonitoringApi } from "./api";
import type { HotspotActiveUser, RouterOnlineUsers } from "./types";

const REFRESH_INTERVAL_MS = 15_000;

export function OnlineUsersPanel({
  limit = 6,
  dedicated = false,
}: {
  limit?: number;
  dedicated?: boolean;
}) {
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [routerFilter, setRouterFilter] = useState("all");
  const [confirmation, setConfirmation] = useState<{
    action: "disconnect" | "block";
    router: RouterOnlineUsers;
    user: HotspotActiveUser;
  } | null>(null);
  const query = useQuery({
    queryKey: ["router-online-users"],
    queryFn: routerMonitoringApi.onlineUsers,
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  const routers = useMemo(() => query.data?.routers ?? [], [query.data?.routers]);
  const rows = useMemo(
    () => routers.flatMap((router) => router.users.map((user) => ({ router, user }))),
    [routers],
  );
  const normalizedSearch = search.trim().toLocaleLowerCase("fr-FR");
  const filteredRows = rows.filter(({ router, user }) => {
    if (routerFilter !== "all" && router.id !== routerFilter) return false;
    if (!normalizedSearch) return true;
    return [user.username, user.address, user.macAddress, router.label, router.zone?.name].some(
      (value) => value?.toLocaleLowerCase("fr-FR").includes(normalizedSearch),
    );
  });
  const visibleRows = Number.isFinite(limit) ? filteredRows.slice(0, limit) : filteredRows;
  const totalBytes = rows.reduce((sum, { user }) => sum + user.bytesIn + user.bytesOut, 0);
  const onlineRouters = routers.filter((router) => router.status === "ONLINE").length;
  const activeCodes = new Set(rows.map(({ user }) => user.username).filter(Boolean)).size;
  const errorMessage =
    query.error instanceof ApiError
      ? query.error.message
      : query.error
        ? "Impossible de joindre le service de supervision."
        : null;

  async function confirmUserAction() {
    if (!confirmation) return;
    const { action, router, user } = confirmation;
    const pendingKey = `${action}-${router.id}-${user.id}`;
    setPendingAction(pendingKey);
    try {
      const result =
        action === "block"
          ? await routerMonitoringApi.blockUser(router.id, user.id, user.macAddress)
          : await routerMonitoringApi.disconnectUser(router.id, user.id, user.macAddress);
      if (!result.ok) throw new Error(result.message);
      toast.success(action === "block" ? "Appareil bloqué" : "Session déconnectée", {
        description: result.message,
      });
      await queryClient.invalidateQueries({ queryKey: ["router-online-users"] });
      setConfirmation(null);
    } catch (error) {
      toast.error("Action impossible", {
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
      });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <>
      <section aria-labelledby="online-users-title" className="space-y-4">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="online-users-title"
                className="text-lg font-semibold tracking-[-0.02em] text-ink"
              >
                Utilisateurs en ligne
              </h2>
              <Badge tone={query.isError ? "danger" : "success"} dot>
                {query.isError ? "Indisponible" : `${query.data?.total ?? 0} actifs`}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted">
              Surveillez la durée, le trafic et les accès connectés à vos routeurs MikroTik.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_160px_44px] lg:w-[570px]">
            <label className="flex h-11 items-center gap-2 rounded-lg border border-border bg-bg px-3 text-muted focus-within:ring-2 focus-within:ring-ring">
              <Search className="size-4 shrink-0" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                placeholder="Ticket, IP ou adresse MAC…"
                aria-label="Rechercher une session"
              />
            </label>
            <select
              value={routerFilter}
              onChange={(event) => setRouterFilter(event.target.value)}
              className="h-11 rounded-lg border border-border bg-bg px-3 text-xs font-medium text-ink outline-none focus:ring-2 focus:ring-ring"
              aria-label="Filtrer par routeur"
            >
              <option value="all">Tous les routeurs</option>
              {routers.map((router) => (
                <option key={router.id} value={router.id}>
                  {router.label}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="icon-sm"
              className="size-11"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
              aria-label="Actualiser les sessions"
              title="Actualiser"
            >
              <RefreshCw className={query.isFetching ? "animate-spin" : ""} />
            </Button>
          </div>
        </header>

        {query.isLoading ? (
          <OnlineUsersSkeleton />
        ) : errorMessage ? (
          <StatePanel
            title="La supervision ne répond pas"
            detail={errorMessage}
            action={
              <Button variant="outline" onClick={() => void query.refetch()}>
                Réessayer
              </Button>
            }
          />
        ) : routers.length === 0 ? (
          <StatePanel
            title="Aucun routeur à interroger"
            detail="Ajoutez un routeur à une zone pour faire apparaître les connexions Hotspot."
          />
        ) : (
          <>
            <dl className="dashboard-panel grid divide-y divide-border overflow-hidden sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <OverviewMetric
                icon={<UserRound />}
                label="Connectés maintenant"
                value={String(query.data?.total ?? 0)}
                detail={`${onlineRouters}/${routers.length} routeurs joignables`}
              />
              <OverviewMetric
                icon={<Activity />}
                label="Données transférées"
                value={formatBytes(totalBytes)}
                detail="Téléchargement et envoi cumulés"
              />
              <OverviewMetric
                icon={<Radio />}
                label="Tickets actifs"
                value={String(activeCodes)}
                detail={`Vérifié à ${formatTime(query.data?.generatedAt)}`}
              />
            </dl>

            {routers.some((router) => router.status !== "ONLINE") && (
              <div
                className="rounded-lg bg-danger-subtle px-4 py-3 text-xs text-danger-subtle-foreground"
                role="alert"
              >
                {routers
                  .filter((router) => router.status !== "ONLINE")
                  .map((router) => router.label)
                  .join(", ")}{" "}
                : supervision indisponible.
              </div>
            )}

            {filteredRows.length === 0 ? (
              <StatePanel
                title={
                  rows.length
                    ? "Aucune session ne correspond"
                    : "Personne n’est connecté pour le moment"
                }
                detail={
                  rows.length
                    ? "Modifiez la recherche ou le filtre routeur."
                    : "Les nouvelles sessions apparaîtront automatiquement sans recharger la page."
                }
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visibleRows.map(({ router, user }, index) => (
                  <SessionCard
                    key={`${router.id}-${user.id}`}
                    router={router}
                    user={user}
                    index={index}
                    pendingAction={pendingAction}
                    onAction={(action) => setConfirmation({ action, router, user })}
                  />
                ))}
              </div>
            )}

            {!dedicated && (filteredRows.length > visibleRows.length || rows.length > 0) && (
              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-xs text-muted">
                  {visibleRows.length} session{visibleRows.length === 1 ? "" : "s"} affichée
                  {visibleRows.length === 1 ? "" : "s"} sur {filteredRows.length}
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/online">Voir toutes les sessions</Link>
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <Modal
        open={confirmation !== null}
        onOpenChange={(open) => !open && !pendingAction && setConfirmation(null)}
      >
        <ModalContent className="max-w-md" hideClose={pendingAction !== null}>
          <ModalHeader>
            <span
              className={`mb-2 grid size-11 place-items-center rounded-lg ${confirmation?.action === "block" ? "bg-danger-subtle text-danger-subtle-foreground" : "bg-primary-subtle text-primary"}`}
            >
              {confirmation?.action === "block" ? (
                <ShieldBan className="size-5" />
              ) : (
                <Unplug className="size-5" />
              )}
            </span>
            <ModalTitle>
              {confirmation?.action === "block"
                ? "Bloquer cet appareil ?"
                : "Déconnecter cette session ?"}
            </ModalTitle>
            <ModalDescription>
              {confirmation?.action === "block"
                ? "Cette adresse MAC ne pourra plus accéder au Hotspot tant que le blocage ne sera pas retiré dans RouterOS."
                : "L’utilisateur sera déconnecté immédiatement et pourra se reconnecter si son ticket reste valide."}
            </ModalDescription>
          </ModalHeader>
          {confirmation && (
            <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border text-sm">
              <div className="bg-surface p-3">
                <dt className="text-xs text-muted">Ticket</dt>
                <dd className="mt-1 font-mono font-semibold text-ink">
                  {confirmation.user.username}
                </dd>
              </div>
              <div className="bg-surface p-3">
                <dt className="text-xs text-muted">Adresse MAC</dt>
                <dd className="mt-1 truncate font-mono text-xs text-ink">
                  {confirmation.user.macAddress}
                </dd>
              </div>
            </dl>
          )}
          <ModalFooter>
            <ModalClose asChild>
              <Button variant="outline" disabled={pendingAction !== null}>
                Annuler
              </Button>
            </ModalClose>
            <Button
              variant={confirmation?.action === "block" ? "danger" : "primary"}
              disabled={pendingAction !== null}
              onClick={() => void confirmUserAction()}
            >
              {pendingAction
                ? "Application…"
                : confirmation?.action === "block"
                  ? "Bloquer l’appareil"
                  : "Déconnecter maintenant"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

type UserActionHandler = (action: "disconnect" | "block") => void;

function SessionCard({
  router,
  user,
  index,
  pendingAction,
  onAction,
}: {
  router: RouterOnlineUsers;
  user: HotspotActiveUser;
  index: number;
  pendingAction: string | null;
  onAction: UserActionHandler;
}) {
  const total = user.bytesIn + user.bytesOut;
  const downloadRatio = total > 0 ? (user.bytesOut / total) * 100 : 50;
  return (
    <m.article
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 5) * 0.025 }}
      className="dashboard-panel overflow-hidden"
    >
      <div className="flex items-start gap-3 border-b border-border p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-subtle text-primary">
          <UserRound className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-mono text-sm font-semibold text-ink">
              {user.username || "Accès inconnu"}
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success-strong">
              <span className="size-1.5 rounded-full bg-success" />
              En ligne
            </span>
          </div>
          <p className="mt-1 truncate font-mono text-xs text-muted">
            {user.address || "IP inconnue"}
          </p>
        </div>
      </div>
      <div className="space-y-4 p-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
          <div>
            <dt className="text-muted">Adresse MAC</dt>
            <dd className="mt-1 truncate font-mono text-[11px] text-ink">
              {user.macAddress || "Inconnue"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Durée connectée</dt>
            <dd className="mt-1 flex items-center gap-1.5 font-mono text-ink">
              <Clock3 className="size-3.5 text-muted" />
              {user.uptime || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Temps restant</dt>
            <dd className="mt-1 font-mono text-warning-subtle-foreground">
              {user.sessionTimeLeft ?? "Sans limite"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Routeur</dt>
            <dd className="mt-1 truncate font-medium text-ink">{router.label}</dd>
          </div>
        </dl>
        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-muted">Données utilisées</p>
              <p className="mt-1 font-mono text-base font-semibold text-ink">
                {formatBytes(total)}
              </p>
            </div>
            <p className="text-right text-[10px] text-muted">
              {humanizeLogin(user.loginBy)}
              <br />
              {router.zone?.name ?? "Sans zone"}
            </p>
          </div>
          <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-surface-2">
            <span className="bg-primary" style={{ width: `${downloadRatio}%` }} />
            <span className="bg-accent" style={{ width: `${100 - downloadRatio}%` }} />
          </div>
          <div className="mt-2 flex justify-between gap-3 text-[10px] text-muted">
            <span className="inline-flex items-center gap-1">
              <Download className="size-3" />
              {formatBytes(user.bytesOut)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Upload className="size-3" />
              {formatBytes(user.bytesIn)}
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
        <Button
          variant="ghost"
          className="h-11 rounded-none text-xs text-muted-strong hover:text-ink"
          aria-label={`Déconnecter la session ${user.username}`}
          disabled={pendingAction !== null}
          onClick={() => onAction("disconnect")}
        >
          {pendingAction === `disconnect-${router.id}-${user.id}` ? (
            <RefreshCw className="animate-spin" />
          ) : (
            <Unplug />
          )}{" "}
          Déconnecter
        </Button>
        <Button
          variant="ghost"
          className="h-11 rounded-none text-xs text-danger-subtle-foreground hover:bg-danger-subtle hover:text-danger-subtle-foreground"
          aria-label={`Bloquer l’appareil ${user.username}`}
          disabled={pendingAction !== null || !user.macAddress}
          onClick={() => onAction("block")}
        >
          {pendingAction === `block-${router.id}-${user.id}` ? (
            <RefreshCw className="animate-spin" />
          ) : (
            <ShieldBan />
          )}{" "}
          Bloquer
        </Button>
      </div>
    </m.article>
  );
}

function OverviewMetric({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-subtle text-primary [&>svg]:size-4">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] text-muted">{label}</dt>
        <dd className="mt-0.5 font-mono text-lg font-semibold text-ink">{value}</dd>
        <p className="truncate text-[10px] text-muted">{detail}</p>
      </div>
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
      <p className="mx-auto mt-1 max-w-xl text-xs leading-5 text-muted">{detail}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
function OnlineUsersSkeleton() {
  return (
    <div className="space-y-3 animate-pulse" aria-label="Chargement des utilisateurs">
      <div className="h-24 rounded-[14px] bg-surface-2" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-64 rounded-[14px] bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 o";
  const units = ["o", "Ko", "Mo", "Go", "To"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: index > 1 ? 1 : 0 }).format(value / 1024 ** index)} ${units[index]}`;
}
function formatTime(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}
function humanizeLogin(value: string) {
  const labels: Record<string, string> = {
    "http-chap": "Portail captif",
    "http-pap": "Portail captif",
    https: "Portail sécurisé",
    cookie: "Cookie navigateur",
    "mac-cookie": "Reconnaissance appareil",
    mac: "Adresse MAC",
  };
  return (labels[value] ?? value) || "Méthode inconnue";
}
