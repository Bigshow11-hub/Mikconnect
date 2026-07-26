"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Badge, Button, Download, FileDown, RefreshCw, toast } from "@mikconnect/ui";

import { ApiError } from "@/lib/api";
import { reportsApi } from "@/features/reports/api";
import type { QuotaValue } from "@/features/reports/types";
import { formatCurrency } from "@/features/tickets/format";

const currentMonth = new Date().toISOString().slice(0, 7);

export default function ReportsPage() {
  const t = useTranslations("Reports");
  const [month, setMonth] = useState(currentMonth);
  const [downloading, setDownloading] = useState<"pdf" | "csv" | null>(null);
  const report = useQuery({
    queryKey: ["monthly-report", month],
    queryFn: () => reportsApi.monthly(month),
  });
  const subscription = useQuery({
    queryKey: ["subscription-usage"],
    queryFn: reportsApi.subscription,
  });

  async function download(format: "pdf" | "csv") {
    setDownloading(format);
    try {
      const blob =
        format === "pdf"
          ? await reportsApi.downloadPdf(month)
          : await reportsApi.downloadCsv(month);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `mikconnect-rapport-${month}.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(`Rapport ${format.toUpperCase()} téléchargé`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Le téléchargement a échoué.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-primary">Pilotage mensuel</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.035em] text-ink">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-[65ch] text-sm text-muted-strong">{t("description")}</p>
        </div>
        <label className="grid gap-1.5 text-xs font-semibold text-muted-strong">
          {t("period")}
          <input
            type="month"
            value={month}
            max={currentMonth}
            onChange={(event) => setMonth(event.target.value)}
            className="h-11 rounded-md border border-border bg-bg px-3 text-sm text-ink"
          />
        </label>
      </header>

      {subscription.isLoading ? (
        <div className="h-28 animate-pulse rounded-xl bg-surface" />
      ) : subscription.isError ? (
        <ErrorState retry={() => void subscription.refetch()} />
      ) : subscription.data ? (
        <SubscriptionPanel data={subscription.data} />
      ) : null}

      {report.isLoading ? (
        <ReportSkeleton />
      ) : report.isError ? (
        <ErrorState retry={() => void report.refetch()} />
      ) : report.data ? (
        <>
          <section
            className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Synthèse mensuelle"
          >
            <Metric
              label={t("revenue")}
              value={formatCurrency(report.data.totals.revenue, report.data.tenant.currency)}
            />
            <Metric
              label={t("netRevenue")}
              value={formatCurrency(report.data.totals.netRevenue, report.data.tenant.currency)}
            />
            <Metric label={t("sales")} value={String(report.data.totals.sales)} />
            <Metric
              label={t("dataUsed")}
              value={`${new Intl.NumberFormat("fr-FR").format(report.data.totals.dataUsedMb)} Mo`}
            />
          </section>

          <div className="flex flex-col gap-3 rounded-xl border border-border bg-bg p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-ink">Exporter la période</h2>
              <p className="mt-1 text-xs text-muted">
                Les exports sont journalisés ; aucun fichier n’est conservé sur le serveur.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                disabled={!subscription.data?.features.accountingCsv || downloading !== null}
                onClick={() => void download("csv")}
              >
                <FileDown />
                {downloading === "csv" ? "Préparation…" : t("downloadCsv")}
              </Button>
              <Button
                disabled={!subscription.data?.features.monthlyPdf || downloading !== null}
                onClick={() => void download("pdf")}
              >
                <Download />
                {downloading === "pdf" ? "Préparation…" : t("downloadPdf")}
              </Button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Breakdown
              title="Forfaits"
              rows={report.data.plans}
              currency={report.data.tenant.currency}
            />
            <Breakdown
              title="Agents"
              rows={report.data.agents}
              currency={report.data.tenant.currency}
            />
          </div>

          {report.data.anomalies.length > 0 ? (
            <section className="rounded-xl border border-warning bg-warning-subtle p-4">
              <h2 className="text-sm font-bold text-warning-subtle-foreground">
                Usages à vérifier
              </h2>
              <ul className="mt-3 space-y-2 text-xs text-warning-subtle-foreground">
                {report.data.anomalies.map((item) => (
                  <li key={item.ticketCode} className="flex justify-between gap-4">
                    <span className="font-mono">{item.ticketCode}</span>
                    <span>
                      {item.usedMb} Mo sur {item.limitMb} Mo
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function SubscriptionPanel({
  data,
}: {
  data: Awaited<ReturnType<typeof reportsApi.subscription>>;
}) {
  return (
    <section className="rounded-xl border border-border bg-bg p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-ink">Abonnement {data.tier}</h2>
          <p className="mt-1 text-xs text-muted">Consommation du mois en cours</p>
        </div>
        <Badge
          tone={data.status === "ACTIVE" || data.status === "TRIALING" ? "success" : "warning"}
        >
          {data.status}
        </Badge>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Quota label="Zones" value={data.usage.zones} />
        <Quota label="Agents" value={data.usage.agents} />
        <Quota label="Tickets" value={data.usage.tickets} />
      </div>
    </section>
  );
}

function Quota({ label, value }: { label: string; value: QuotaValue }) {
  const percent =
    value.limit === null
      ? 0
      : Math.min(100, Math.round((value.used / Math.max(1, value.limit)) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="font-semibold text-muted-strong">{label}</span>
        <span className="font-mono text-ink">
          {value.used} / {value.limit ?? "∞"}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full ${percent >= 90 ? "bg-warning" : "bg-primary"}`}
          style={{ width: value.limit === null ? "8%" : `${percent}%` }}
        />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 font-mono text-xl font-bold text-ink">{value}</p>
    </div>
  );
}

function Breakdown({
  title,
  rows,
  currency,
}: {
  title: string;
  rows: Array<{ id: string; label: string; sales: number; revenue: number }>;
  currency: "XOF" | "GNF";
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-bg">
      <h2 className="border-b border-border px-4 py-3 text-sm font-bold text-ink">{title}</h2>
      {rows.length === 0 ? (
        <p className="p-5 text-sm text-muted">Aucune vente sur cette période.</p>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{row.label}</p>
                <p className="mt-1 text-xs text-muted">
                  {row.sales} vente{row.sales > 1 ? "s" : ""}
                </p>
              </div>
              <span className="font-mono text-sm font-bold text-ink">
                {formatCurrency(row.revenue, currency)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ErrorState({ retry }: { retry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-danger bg-danger-subtle p-4">
      <p className="text-sm font-semibold text-danger-subtle-foreground">
        Impossible de charger ces données.
      </p>
      <Button variant="outline" size="sm" onClick={retry}>
        <RefreshCw />
        Réessayer
      </Button>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="grid gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-24 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl bg-surface" />
        <div className="h-64 animate-pulse rounded-xl bg-surface" />
      </div>
    </div>
  );
}
