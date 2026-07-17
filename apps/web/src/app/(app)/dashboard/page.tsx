"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import * as m from "motion/react-m";
import { Button, CalendarDays, CreditCard, Plus, RefreshCw, SignalHigh, Ticket, Users } from "@mikconnect/ui";
import { useAuth } from "@/features/auth/use-auth";
import { routersApi } from "@/features/onboarding/api";
import { routerMonitoringApi } from "@/features/routers/api";
import { ActivityInsights } from "@/features/dashboard/activity-insights";
import { OnlineUsersPanel } from "@/features/routers/online-users-panel";
import { ticketsApi } from "@/features/tickets/api";
import { radiusApi } from "@/features/radius/api";
import { ReconciliationPanel } from "@/features/radius/reconciliation-panel";
import { formatAmount } from "@/features/tickets/format";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const routersQuery = useQuery({ queryKey: ["routers"], queryFn: routersApi.findAll });
  const overviewQuery = useQuery({ queryKey: ["business-overview"], queryFn: ticketsApi.overview, refetchInterval: 15_000, refetchIntervalInBackground: false });
  const onlineUsersQuery = useQuery({ queryKey: ["router-online-users"], queryFn: routerMonitoringApi.onlineUsers, refetchInterval: 15_000, refetchIntervalInBackground: false });
  const reconciliationQuery = useQuery({ queryKey: ["radius-reconciliation"], queryFn: radiusApi.reconciliation, refetchInterval: 30_000, refetchIntervalInBackground: false });

  useEffect(() => { if (!routersQuery.isLoading && routersQuery.data?.length === 0) router.replace("/onboarding"); }, [routersQuery.data, routersQuery.isLoading, router]);

  const overview = overviewQuery.data;
  const onlineUsers = onlineUsersQuery.data;
  const currency = overview?.currency ?? user?.tenant.currency ?? "XOF";
  const refreshing = overviewQuery.isFetching || onlineUsersQuery.isFetching || reconciliationQuery.isFetching;
  const recent = overview?.salesTrend.slice(-7) ?? [];
  const previous = overview?.salesTrend.slice(-14, -7) ?? [];
  const trend = percentageChange(recent.reduce((sum, day) => sum + day.revenue, 0), previous.reduce((sum, day) => sum + day.revenue, 0));

  async function refreshDashboard() { await Promise.all([overviewQuery.refetch(), onlineUsersQuery.refetch(), reconciliationQuery.refetch()]); }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div><div className="mb-1.5 flex items-center gap-2 text-[11px] font-medium text-muted"><span className="size-1.5 rounded-full bg-success" /> Données synchronisées</div><h1 className="text-2xl font-bold tracking-[-0.035em] text-ink">Tableau de bord</h1><p className="mt-1 text-xs text-muted">Ventes, réseau et utilisateurs de votre WiFi Zone.</p></div>
        <div className="flex flex-wrap gap-2"><span className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-border bg-panel px-3 text-xs font-medium text-muted-strong"><CalendarDays className="size-3.5" />14 derniers jours</span><Button variant="outline" size="sm" disabled={refreshing} onClick={() => void refreshDashboard()}><RefreshCw className={refreshing ? "animate-spin" : ""} /> Actualiser</Button><Button asChild size="sm"><Link href="/tickets/new"><Plus /> Générer</Link></Button></div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-4" aria-label="Indicateurs principaux">
        <KpiCard label="Revenu ce mois" value={`${formatAmount(overview?.revenueMonth ?? 0, currency)} ${currency}`} detail="encaissé et confirmé" icon={<CreditCard />} trend={trend} loading={overviewQuery.isLoading} />
        <KpiCard label="Utilisateurs en ligne" value={String(onlineUsers?.total ?? 0)} detail={`${overview?.connectionsToday ?? 0} connexions aujourd’hui`} icon={<Users />} live loading={onlineUsersQuery.isLoading} />
        <KpiCard label="Tickets vendus" value={String(overview?.salesToday ?? 0)} detail={`${overview?.salesTodayOnline ?? 0} en ligne · ${overview?.salesTodayPhysical ?? 0} physiques`} icon={<Ticket />} loading={overviewQuery.isLoading} />
        <KpiCard label="Réseau actif" value={`${overview?.routersOnline ?? 0}/${overview?.routersTotal ?? 0}`} detail={`${overview?.activeTickets ?? 0} tickets disponibles`} icon={<SignalHigh />} healthy={(overview?.routersTotal ?? 0) > 0 && overview?.routersOnline === overview?.routersTotal} loading={overviewQuery.isLoading} />
      </section>

      <ActivityInsights overview={overview} onlineUsers={onlineUsers} currency={currency} loading={overviewQuery.isLoading || onlineUsersQuery.isLoading} />
      <OnlineUsersPanel />
      <ReconciliationPanel data={reconciliationQuery.data} loading={reconciliationQuery.isLoading} />
    </div>
  );
}

function KpiCard({ label, value, detail, icon, trend, loading, live, healthy }: { label: string; value: string; detail: string; icon: React.ReactNode; trend?: number | null; loading: boolean; live?: boolean; healthy?: boolean }) {
  return <m.article initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} className="dashboard-panel min-w-0 p-4"><div className="flex items-start justify-between gap-3"><p className="text-[11px] font-semibold text-muted">{label}</p><span className={`grid size-7 place-items-center rounded-lg [&>svg]:size-3.5 ${live || healthy ? "bg-success-subtle text-success-strong" : "bg-primary-subtle text-primary"}`}>{icon}</span></div>{loading ? <div className="mt-3 h-7 w-20 animate-pulse rounded bg-surface-2" /> : <p className="mt-2 font-mono text-[1.65rem] font-semibold leading-none tracking-[-0.04em] text-ink">{value}</p>}<div className="mt-3 flex items-center justify-between gap-2"><p className="truncate text-[10px] text-muted">{detail}</p>{typeof trend === "number" && <span className={`rounded-full px-1.5 py-1 font-mono text-[9px] font-semibold ${trend >= 0 ? "bg-success-subtle text-success-strong" : "bg-danger-subtle text-danger-subtle-foreground"}`}>{trend >= 0 ? "+" : ""}{trend}%</span>}{live && <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-success-strong"><span className="size-1 rounded-full bg-success" />Live</span>}</div></m.article>;
}

function percentageChange(current: number, previous: number) { if (previous <= 0) return current > 0 ? 100 : null; return Math.round(((current - previous) / previous) * 100); }
