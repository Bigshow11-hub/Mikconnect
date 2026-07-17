"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import {
  Badge,
  Button,
  CheckCircle2,
  Copy,
  ExternalLink,
  Smartphone,
  Store,
  toast,
} from "@mikconnect/ui";
import { useAuth } from "@/features/auth/use-auth";
import { paymentsApi } from "@/features/payments/api";
import type { PaymentStatus } from "@/features/payments/types";
import { formatAmount } from "@/features/tickets/format";

const STATUS: Record<PaymentStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  SUCCESS: { label: "Payé", tone: "success" },
  PENDING: { label: "En attente", tone: "warning" },
  FAILED: { label: "Échoué", tone: "danger" },
  CANCELLED: { label: "Annulé", tone: "neutral" },
};

export default function PaymentsPage() {
  const { user } = useAuth();
  const [storeUrl, setStoreUrl] = useState("");
  const { data: summary } = useQuery({ queryKey: ["payments-summary"], queryFn: paymentsApi.summary });
  const { data: payments, isLoading } = useQuery({ queryKey: ["payments"], queryFn: paymentsApi.list });

  useEffect(() => {
    if (user) setStoreUrl(`${window.location.origin}/acheter/${user.tenantId}`);
  }, [user]);

  async function copyLink() {
    await navigator.clipboard.writeText(storeUrl);
    toast.success("Lien copié", { description: "Vous pouvez le partager à vos clients." });
  }

  const currency = user?.tenant.currency ?? "XOF";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm text-muted">Encaissement direct</p>
          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-ink sm:text-3xl">Paiements mobile money</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">Vos clients choisissent un forfait, paient depuis leur téléphone et reçoivent leur code par SMS.</p>
        </div>
        {storeUrl && (
          <Button asChild variant="outline"><Link href={storeUrl} target="_blank">Voir le point de vente <ExternalLink /></Link></Button>
        )}
      </header>

      <section className="grid overflow-hidden rounded-[14px] border border-border bg-bg lg:grid-cols-[1.2fr_.8fr]">
        <div className="p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-subtle text-primary-subtle-foreground"><Store className="size-5" /></span>
            <div>
              <h2 className="font-semibold text-ink">Votre point de vente public</h2>
              <p className="mt-1 text-sm leading-6 text-muted">Partagez ce lien par WhatsApp, affichez-le sur place ou transformez-le en QR code.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-2 rounded-lg bg-surface-2 p-2 sm:flex-row">
            <code className="min-w-0 flex-1 truncate px-2 py-2 font-mono text-xs text-ink">{storeUrl || "Préparation du lien…"}</code>
            <Button onClick={copyLink} disabled={!storeUrl}><Copy /> Copier le lien</Button>
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted"><CheckCircle2 className="size-4 text-success" /> Le prix et les forfaits sont synchronisés avec votre espace.</p>
        </div>
        <div className="border-t border-border bg-inverse p-5 text-inverse-foreground sm:p-7 lg:border-l lg:border-t-0">
          <p className="text-sm text-inverse-foreground/60">Revenu mobile money</p>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-[-0.04em]">{formatAmount(summary?.revenue ?? 0, currency)} <span className="text-sm text-inverse-foreground/50">{currency}</span></p>
          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-inverse-foreground/10 pt-4">
            <MiniMetric label="Confirmés" value={summary?.successful ?? 0} />
            <MiniMetric label="En attente" value={summary?.pending ?? 0} />
            <MiniMetric label="Échecs" value={summary?.failed ?? 0} />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><h2 className="text-lg font-semibold tracking-tight text-ink">Transactions récentes</h2><p className="text-sm text-muted">Paiement, ticket et livraison SMS dans une seule trace.</p></div>
        </div>
        <div className="overflow-hidden rounded-[14px] border border-border bg-bg">
          {isLoading ? (
            <p className="px-5 py-8 text-sm text-muted">Chargement des paiements…</p>
          ) : !payments?.length ? (
            <div className="grid justify-items-center px-5 py-12 text-center"><Smartphone className="size-7 text-muted" /><p className="mt-3 font-medium text-ink">Aucun paiement pour le moment</p><p className="mt-1 max-w-sm text-sm text-muted">Partagez votre point de vente pour recevoir votre première commande.</p></div>
          ) : (
            <ul className="divide-y divide-border">
              {payments.map((payment) => (
                <li key={payment.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_160px_130px] sm:items-center sm:px-5">
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{payment.ticket.plan.name}</p><p className="mt-0.5 truncate font-mono text-xs text-muted">{payment.providerTxId} · {payment.customerPhone}</p></div>
                  <div className="sm:text-right"><p className="font-mono text-sm font-semibold text-ink">{formatAmount(payment.amount, payment.currency)}</p><p className="text-xs text-muted">{payment.provider}</p></div>
                  <div className="flex items-center gap-2 sm:justify-end"><Badge tone={STATUS[payment.status].tone} dot>{STATUS[payment.status].label}</Badge>{payment.smsDelivery?.status === "SENT" && <span title="SMS envoyé"><CheckCircle2 className="size-4 text-success" /></span>}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return <div><p className="font-mono text-lg font-semibold">{value}</p><p className="mt-0.5 text-xs text-inverse-foreground/50">{label}</p></div>;
}
