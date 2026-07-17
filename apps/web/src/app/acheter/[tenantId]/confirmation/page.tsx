"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Button, CheckCircle2, Copy, Smartphone, toast } from "@mikconnect/ui";
import { publicPaymentsApi } from "@/features/payments/api";
import { formatAmount } from "@/features/tickets/format";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ConfirmationPage() {
  return <Suspense fallback={<ConfirmationLoading />}><ConfirmationContent /></Suspense>;
}

function ConfirmationContent() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const transactionId = useSearchParams().get("transaction_id") ?? "";
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-payment-status", tenantId, transactionId],
    queryFn: () => publicPaymentsApi.status(tenantId, transactionId),
    enabled: !!tenantId && !!transactionId,
    refetchInterval: (query) => query.state.data?.status === "PENDING" ? 2_000 : false,
  });

  async function copyCode() {
    if (!data?.ticketCode) return;
    await navigator.clipboard.writeText(data.ticketCode);
    toast.success("Code copié");
  }

  const pending = isLoading || data?.status === "PENDING";
  const success = data?.status === "SUCCESS";

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-8">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-bg">
        <div className="flex items-center justify-between border-b border-border px-6 py-4"><Link href={`/acheter/${tenantId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-ink"><span className="grid size-7 place-items-center rounded-md bg-inverse font-mono text-[10px] text-inverse-foreground">mk</span> mikconnect</Link><ThemeToggle /></div>
        <div className="px-6 py-8 sm:px-8 sm:py-10">
          {pending ? (
            <div className="text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-warning-subtle"><span className="size-2.5 animate-pulse rounded-full bg-warning-strong" /></span><h1 className="mt-5 text-xl font-semibold text-ink">Confirmation du paiement…</h1><p className="mt-2 text-sm leading-6 text-muted">Validez la demande sur votre téléphone. Cette page se met à jour automatiquement.</p></div>
          ) : success ? (
            <div>
              <div className="text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-success-subtle text-success-strong"><CheckCircle2 className="size-7" /></span><h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">Vous êtes prêt à vous connecter.</h1><p className="mt-2 text-sm text-muted">Paiement confirmé · {data.planName} · {formatAmount(data.amount, data.currency)} {data.currency}</p></div>
              <div className="mt-7 rounded-xl bg-inverse px-5 py-6 text-center text-inverse-foreground"><p className="text-xs text-inverse-foreground/55">Votre code WiFi</p><p className="mt-2 select-all font-mono text-3xl font-semibold tracking-[0.08em]">{data.ticketCode}</p><Button variant="outline" className="mt-4 border-inverse-foreground/20 bg-transparent text-inverse-foreground hover:bg-inverse-foreground/10 hover:text-inverse-foreground" onClick={copyCode}><Copy /> Copier le code</Button></div>
              <div className="mt-5 flex items-start gap-3 rounded-lg bg-surface-2 p-4"><Smartphone className="mt-0.5 size-[18px] shrink-0 text-primary" /><p className="text-sm leading-6 text-muted">{data.smsStatus === "SENT" ? "Ce code vient aussi d'être envoyé par SMS." : "Le SMS est en cours d'envoi. Vous pouvez déjà copier le code ci-dessus."}</p></div>
            </div>
          ) : (
            <div className="text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-danger-subtle text-danger">!</span><h1 className="mt-5 text-xl font-semibold text-ink">Paiement non confirmé</h1><p className="mt-2 text-sm text-muted">{error ? "Le statut n'a pas pu être vérifié." : "La transaction a été annulée ou refusée. Aucun ticket n'a été consommé."}</p><Button asChild className="mt-6"><Link href={`/acheter/${tenantId}`}>Réessayer</Link></Button></div>
          )}
        </div>
        <div className="border-t border-border bg-surface px-6 py-4 text-center font-mono text-[11px] text-muted">Transaction {transactionId || "indisponible"}</div>
      </div>
    </main>
  );
}

function ConfirmationLoading() { return <main className="grid min-h-dvh place-items-center bg-canvas"><p className="text-sm text-muted">Vérification…</p></main>; }
