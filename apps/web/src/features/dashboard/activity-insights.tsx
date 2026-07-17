"use client";

import Link from "next/link";
import * as m from "motion/react-m";
import { ArrowUpRight, Button, Radio, Smartphone, Store } from "@mikconnect/ui";

import { formatAmount } from "@/features/tickets/format";
import type { BusinessOverview, Currency } from "@/features/tickets/types";
import type { OnlineUsersOverview } from "@/features/routers/types";

interface ActivityInsightsProps {
  overview?: BusinessOverview;
  onlineUsers?: OnlineUsersOverview;
  currency: Currency;
  loading: boolean;
}

export function ActivityInsights({ overview, onlineUsers, currency, loading }: ActivityInsightsProps) {
  const salesTrend = overview?.salesTrend ?? [];
  const usageTrend = overview?.usageTrend ?? [];
  const physical = salesTrend.reduce((sum, day) => sum + day.revenuePhysical, 0);
  const online = salesTrend.reduce((sum, day) => sum + day.revenueOnline, 0);
  const sales = salesTrend.reduce((sum, day) => sum + day.sales, 0);

  return (
    <section aria-label="Analyse de l’activité" className="grid gap-4 md:grid-cols-12">
      <article className="dashboard-panel overflow-hidden md:col-span-8">
        <div className="flex flex-col gap-5 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">Revenu total</p>
              <p className="mt-1 text-xs text-muted">Évolution des encaissements · 14 derniers jours</p>
            </div>
            <span className="inline-flex items-center gap-2 text-[11px] font-medium text-muted">
              <span className="size-1.5 rounded-full bg-success" /> Synchronisé
            </span>
          </div>
          <div className="grid items-end gap-4 xl:grid-cols-[150px_minmax(0,1fr)]">
            <div>
              <p className="font-mono text-[1.8rem] font-semibold leading-none tracking-[-0.045em] text-ink">
                {loading ? "—" : `${formatAmount(physical + online, currency)} ${currency}`}
              </p>
              <p className="mt-2 text-xs text-muted">encaissé sur la période</p>
            </div>
            {loading ? <ChartSkeleton className="h-44" /> : <RevenueLineChart data={salesTrend} currency={currency} />}
          </div>
        </div>
        <dl className="grid grid-cols-3 divide-x divide-border border-t border-border">
          <SummaryMetric label="Ventes physiques" value={`${formatAmount(physical, currency)} ${currency}`} tone="primary" />
          <SummaryMetric label="Paiements en ligne" value={`${formatAmount(online, currency)} ${currency}`} tone="success" />
          <SummaryMetric label="Tickets vendus" value={String(sales)} tone="warning" />
        </dl>
      </article>

      <div className="grid gap-4 sm:grid-cols-3 md:col-span-4 md:grid-cols-1">
        <ActiveDays data={usageTrend} loading={loading} />
        <NetworkHealth overview={overview} onlineUsers={onlineUsers} loading={loading} />
        <LatestSale sale={overview?.recentSales[0]} currency={currency} loading={loading} />
      </div>
    </section>
  );
}

function RevenueLineChart({ data, currency }: { data: BusinessOverview["salesTrend"]; currency: Currency }) {
  const width = 680;
  const height = 190;
  const pad = { left: 12, right: 12, top: 18, bottom: 28 };
  const max = Math.max(1, ...data.map((day) => day.revenue));
  const points = data.map((day, index) => ({
    x: pad.left + (data.length <= 1 ? (width - pad.left - pad.right) / 2 : (index / (data.length - 1)) * (width - pad.left - pad.right)),
    y: pad.top + (height - pad.top - pad.bottom) - (day.revenue / max) * (height - pad.top - pad.bottom),
  }));
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const area = points.length ? `${line} L${points.at(-1)?.x},${height - pad.bottom} L${points[0]?.x},${height - pad.bottom} Z` : "";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Courbe du revenu des 14 derniers jours">
      <defs><linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--primary)" stopOpacity=".22" /><stop offset="1" stopColor="var(--primary)" stopOpacity="0" /></linearGradient></defs>
      {[0, 1, 2, 3].map((row) => <line key={row} x1={pad.left} x2={width - pad.right} y1={pad.top + row * ((height - pad.top - pad.bottom) / 3)} y2={pad.top + row * ((height - pad.top - pad.bottom) / 3)} stroke="var(--border)" />)}
      <m.path initial={{ opacity: 0 }} animate={{ opacity: 1 }} d={area} fill="url(#revenue-fill)" />
      <m.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .7 }} d={line} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => <circle key={data[index]?.date} cx={point.x} cy={point.y} r="8" fill="transparent"><title>{`${data[index]?.label}: ${formatAmount(data[index]?.revenue ?? 0, currency)} ${currency}`}</title></circle>)}
      {data.map((day, index) => (index % 3 === 0 || index === data.length - 1) && <text key={day.date} x={points[index]?.x} y={height - 7} textAnchor="middle" fill="var(--muted)" fontSize="10">{day.label.replace(".", "")}</text>)}
      {!data.some((day) => day.revenue) && <text x={width / 2} y={height / 2} textAnchor="middle" fill="var(--muted)" fontSize="12">Les ventes traceront la tendance ici.</text>}
    </svg>
  );
}

function ActiveDays({ data, loading }: { data: BusinessOverview["usageTrend"]; loading: boolean }) {
  const max = Math.max(1, ...data.map((day) => day.connections));
  const best = data.reduce((winner, day) => day.connections > (winner?.connections ?? -1) ? day : winner, data[0]);
  return (
    <article className="dashboard-panel p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-ink">Jours les plus actifs</p><p className="mt-1 text-[11px] text-muted">Connexions quotidiennes</p></div><span className="text-[11px] font-semibold text-primary">{best?.connections ?? 0} max</span></div>
      {loading ? <ChartSkeleton className="h-24" /> : <div className="mt-4 flex h-24 items-end justify-between gap-2" aria-label="Connexions par jour">
        {data.slice(-7).map((day) => { const active = day.date === best?.date; return <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"><span className="font-mono text-[9px] text-muted">{day.connections || ""}</span><m.span initial={{ height: 4 }} animate={{ height: `${Math.max(10, (day.connections / max) * 58)}px` }} className={`w-full max-w-7 rounded-md ${active ? "bg-primary" : "bg-surface-2"}`} /><span className={`text-[9px] ${active ? "font-semibold text-primary" : "text-muted"}`}>{day.label.slice(0, 3)}</span></div>; })}
      </div>}
    </article>
  );
}

function NetworkHealth({ overview, onlineUsers, loading }: { overview?: BusinessOverview; onlineUsers?: OnlineUsersOverview; loading: boolean }) {
  const total = overview?.routersTotal ?? 0;
  const online = overview?.routersOnline ?? 0;
  const ratio = total ? Math.round((online / total) * 100) : 0;
  return (
    <article className="dashboard-panel flex items-center justify-between gap-4 p-4">
      <div><p className="text-sm font-semibold text-ink">Santé du réseau</p><p className="mt-1 text-[11px] text-muted">Routeurs MikroTik joignables</p><p className="mt-3 text-xs font-medium text-ink"><Radio className="mr-1.5 inline size-3.5 text-success" />{onlineUsers?.total ?? 0} utilisateur{onlineUsers?.total === 1 ? "" : "s"} en ligne</p></div>
      {loading ? <div className="size-20 animate-pulse rounded-full bg-surface-2" /> : <div className="relative size-20 shrink-0"><svg viewBox="0 0 80 80" className="-rotate-90"><circle cx="40" cy="40" r="31" fill="none" stroke="var(--surface-2)" strokeWidth="8" /><m.circle initial={{ pathLength: 0 }} animate={{ pathLength: ratio / 100 }} cx="40" cy="40" r="31" fill="none" stroke="var(--success)" strokeWidth="8" strokeLinecap="round" /></svg><span className="absolute inset-0 grid place-items-center font-mono text-sm font-semibold text-ink">{ratio}%</span></div>}
    </article>
  );
}

function LatestSale({ sale, currency, loading }: { sale?: BusinessOverview["recentSales"][number]; currency: Currency; loading: boolean }) {
  const online = sale?.channel === "MOBILE_MONEY";
  return (
    <article className="dashboard-panel p-4">
      <div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-ink">Dernière vente</p><p className="mt-1 text-[11px] text-muted">Mise à jour automatique</p></div><Button asChild variant="ghost" size="icon-sm" aria-label="Voir les ventes"><Link href="/tickets"><ArrowUpRight /></Link></Button></div>
      {loading ? <ChartSkeleton className="h-12" /> : sale ? <m.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={sale.id} className="mt-3 flex items-center gap-3"><span className={`grid size-9 shrink-0 place-items-center rounded-[10px] ${online ? "bg-success-subtle text-success-strong" : "bg-primary-subtle text-primary"}`}>{online ? <Smartphone className="size-4" /> : <Store className="size-4" />}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-ink">{sale.ticket.plan.name}</p><p className="mt-0.5 truncate font-mono text-[10px] text-muted">{sale.ticket.code}</p></div><p className="font-mono text-xs font-semibold text-success-strong">+{formatAmount(sale.amount, currency)}</p></m.div> : <p className="mt-4 text-xs text-muted">La prochaine vente apparaîtra ici.</p>}
    </article>
  );
}

function SummaryMetric({ label, value, tone }: { label: string; value: string; tone: "primary" | "success" | "warning" }) {
  const colors = { primary: "bg-primary", success: "bg-success", warning: "bg-warning-strong" };
  return <div className="min-w-0 px-3 py-3.5 sm:px-4"><dt className="flex items-center gap-2 truncate text-[10px] text-muted"><span className={`size-2 rounded-sm ${colors[tone]}`} />{label}</dt><dd className="mt-1.5 truncate font-mono text-xs font-semibold text-ink">{value}</dd></div>;
}

function ChartSkeleton({ className }: { className: string }) { return <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} />; }
