import { Activity, Badge, ShieldCheck, Ticket } from "@mikconnect/ui";
import type { ReconciliationOverview } from "./types";

export function ReconciliationPanel({ data, loading }: { data?: ReconciliationOverview; loading: boolean }) {
  if (loading) return <section className="h-48 animate-pulse rounded-[14px] bg-surface-2" aria-label="Rapprochement des tickets en cours" />;

  const generated = data?.generated ?? 0;
  const sold = data?.sold ?? 0;
  const used = data?.used ?? 0;
  const soldRate = generated > 0 ? Math.round((sold / generated) * 100) : 0;
  const usedRate = sold > 0 ? Math.round((used / sold) * 100) : 0;
  const stages = [
    { label: "Générés", value: generated, detail: `${data?.available ?? 0} disponibles`, rate: 100 },
    { label: "Vendus", value: sold, detail: `${data?.soldNotUsed ?? 0} en attente d’utilisation`, rate: soldRate },
    { label: "Utilisés", value: used, detail: `${data?.activeSessions ?? 0} sessions actives`, rate: usedRate },
  ];

  return <section className="dashboard-panel overflow-hidden" aria-labelledby="reconciliation-title">
    <header className="flex flex-col justify-between gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><Activity className="size-4 text-primary" /><h2 id="reconciliation-title" className="text-base font-semibold tracking-[-0.02em] text-ink">Rapprochement des tickets</h2></div><p className="mt-1 text-xs text-muted">Suivez chaque ticket de sa génération jusqu’à son utilisation sur le réseau.</p></div><Badge tone={data?.alert ? "danger" : "success"} dot>{data?.alert ? `Écart ${data.gapPercent.toLocaleString("fr-FR")}%` : "Flux contrôlé"}</Badge></header>

    <div className="grid md:grid-cols-[minmax(0,1fr)_240px]">
      <div className="px-5 py-5">
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-0">
          {stages.map((stage, index) => <div key={stage.label} className="relative sm:px-4 sm:first:pl-0 sm:last:pr-0">
            {index > 0 && <span className="absolute -left-px top-7 hidden h-px w-4 -translate-x-full bg-border-strong sm:block" />}
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-muted">{stage.label}</p><p className="mt-1 font-mono text-2xl font-semibold tracking-[-0.035em] text-ink">{stage.value}</p></div><span className={`grid size-8 place-items-center rounded-lg ${index === 2 ? "bg-success-subtle text-success-strong" : "bg-primary-subtle text-primary"}`}><Ticket className="size-3.5" /></span></div>
            <p className="mt-2 text-[11px] text-muted">{stage.detail}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className={`h-full rounded-full ${index === 2 ? "bg-success" : "bg-primary"}`} style={{ width: `${Math.min(100, stage.rate)}%` }} /></div>
            <p className="mt-1.5 font-mono text-[10px] text-muted">{index === 0 ? "Base du lot" : `${stage.rate}% de l’étape précédente`}</p>
          </div>)}
        </div>
      </div>

      <aside className={`border-t border-border p-5 md:border-l md:border-t-0 ${data?.alert ? "bg-danger-subtle" : "bg-success-subtle"}`} aria-label="Contrôle du rapprochement">
        <div className="flex items-start justify-between gap-3"><div><p className={`text-xs font-semibold ${data?.alert ? "text-danger-subtle-foreground" : "text-success-subtle-foreground"}`}>Contrôle d’intégrité</p><p className="mt-1 text-[11px] text-muted">Tolérance maximale {data?.thresholdPercent ?? 0}%</p></div><ShieldCheck className={`size-5 ${data?.alert ? "text-danger-subtle-foreground" : "text-success-strong"}`} /></div>
        <p className={`mt-5 font-mono text-3xl font-semibold ${data?.alert ? "text-danger-subtle-foreground" : "text-success-subtle-foreground"}`}>{data?.gapPercent ?? 0}%</p>
        <p className="mt-1 text-xs text-muted">d’écart entre ventes et usages détectés</p>
        <dl className="mt-4 space-y-2 border-t border-current/10 pt-3 text-xs"><div className="flex justify-between gap-3"><dt className="text-muted">Usages sans vente</dt><dd className="font-mono font-semibold text-ink">{data?.usedWithoutSale ?? 0}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted">Sessions actives</dt><dd className="font-mono font-semibold text-ink">{data?.activeSessions ?? 0}</dd></div></dl>
      </aside>
    </div>
  </section>;
}
