"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";

import {
  Button,
  Check,
  CheckCircle2,
  Input,
  Label,
  ShieldCheck,
  Smartphone,
  Wifi,
} from "@mikconnect/ui";
import { ApiError } from "@/lib/api";
import { publicPaymentsApi } from "@/features/payments/api";
import type { PaymentProvider } from "@/features/payments/types";
import { formatAmount, formatDuration } from "@/features/tickets/format";
import { ThemeToggle } from "@/components/theme-toggle";

const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  ORANGE: "Orange Money",
  MTN: "MTN MoMo",
  MOOV: "Moov Money",
  WAVE: "Wave",
  SUDI: "SudiPay",
};

export default function PublicStorePage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { data: store, isLoading, error } = useQuery({
    queryKey: ["public-store", tenantId],
    queryFn: () => publicPaymentsApi.store(tenantId),
    enabled: !!tenantId,
  });
  const [planId, setPlanId] = useState("");
  const [provider, setProvider] = useState<PaymentProvider | "">("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (store && !planId) setPlanId(store.plans[0]?.id ?? "");
    if (store && !provider) setProvider(store.providers[0] ?? "");
  }, [store, planId, provider]);

  const payment = useMutation({
    mutationFn: () => publicPaymentsApi.initiate(tenantId, { planId, provider: provider as PaymentProvider, customerPhone: phone }),
    onSuccess: (result) => window.location.assign(result.paymentUrl),
  });

  if (isLoading) return <PublicLoading />;
  if (error || !store) return <PublicError />;
  const selected = store.plans.find((plan) => plan.id === planId);

  return (
    <main className="min-h-dvh bg-canvas px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto mb-3 flex max-w-6xl justify-end"><ThemeToggle /></div>
      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-border bg-bg lg:grid lg:min-h-[calc(100dvh-6rem)] lg:grid-cols-[.78fr_1.22fr]">
        <section className="relative flex flex-col justify-between overflow-hidden bg-inverse p-6 text-inverse-foreground sm:p-8 lg:p-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-inverse-foreground font-mono text-sm font-bold text-inverse">mk</span>
              <div><p className="text-sm font-semibold">{store.name}</p><p className="text-xs text-inverse-foreground/55">Accès WiFi sécurisé</p></div>
            </div>
            <div className="mt-12 max-w-sm">
              <h1 className="text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-4xl">Connectez-vous en quelques instants.</h1>
              <p className="mt-4 text-sm leading-6 text-inverse-foreground/65">Choisissez votre durée, payez avec votre mobile money habituel et recevez votre code par SMS.</p>
            </div>
          </div>

          <div className="mt-12 space-y-4 border-t border-inverse-foreground/10 pt-6">
            <TrustLine icon={<Smartphone />} text="Paiement depuis votre téléphone" />
            <TrustLine icon={<CheckCircle2 />} text="Code envoyé automatiquement par SMS" />
            <TrustLine icon={<ShieldCheck />} text="Transaction vérifiée par CinetPay" />
          </div>
          <div className="absolute bottom-0 right-0 h-32 w-1 bg-primary" aria-hidden="true" />
        </section>

        <section className="p-5 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-xl">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
              <div><p className="text-sm font-semibold text-ink">Acheter un accès</p><p className="mt-0.5 text-xs text-muted">3 étapes · environ 1 minute</p></div>
              <Wifi className="size-5 text-primary" />
            </div>

            <form className="mt-7 space-y-8" onSubmit={(event) => { event.preventDefault(); payment.mutate(); }}>
              <fieldset>
                <legend className="flex items-baseline gap-2 text-base font-semibold text-ink"><span className="font-mono text-xs text-primary">01</span> Choisissez votre forfait</legend>
                <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
                  {store.plans.map((plan) => {
                    const checked = plan.id === planId;
                    return (
                      <label key={plan.id} className={`flex cursor-pointer items-center gap-4 px-4 py-4 transition-colors ${checked ? "bg-primary-subtle" : "hover:bg-surface-2"}`}>
                        <input type="radio" name="plan" value={plan.id} checked={checked} onChange={() => setPlanId(plan.id)} className="sr-only" />
                        <span className={`grid size-5 shrink-0 place-items-center rounded-full border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border-strong"}`}>{checked && <Check className="size-3" />}</span>
                        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{plan.name}</span><span className="mt-0.5 block text-xs text-muted">{formatDuration(plan.durationMinutes)}{plan.dataLimitMb ? ` · ${plan.dataLimitMb} Mo` : " · données illimitées"}</span></span>
                        <span className="font-mono text-sm font-semibold text-ink">{formatAmount(plan.price, plan.currency)} <span className="text-xs text-muted">{plan.currency}</span></span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="flex items-baseline gap-2 text-base font-semibold text-ink"><span className="font-mono text-xs text-primary">02</span> Moyen de paiement</legend>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {store.providers.map((item) => (
                    <label key={item} className={`cursor-pointer rounded-lg border px-3 py-3 text-center text-sm font-medium transition-colors ${provider === item ? "border-primary bg-primary-subtle text-primary-subtle-foreground" : "border-border text-ink hover:bg-surface-2"}`}>
                      <input type="radio" name="provider" value={item} checked={provider === item} onChange={() => setProvider(item)} className="sr-only" />
                      {PROVIDER_LABEL[item]}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <div className="flex items-baseline gap-2 text-base font-semibold text-ink"><span className="font-mono text-xs text-primary">03</span> Numéro de téléphone</div>
                <div className="mt-3 space-y-1.5"><Label htmlFor="customer-phone">Numéro utilisé pour payer et recevoir le code</Label><Input id="customer-phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder={store.country === "CI" ? "+225 07 00 00 00 00" : "+224 620 00 00 00"} value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
              </div>

              {payment.error && <p role="alert" className="rounded-lg bg-danger-subtle px-4 py-3 text-sm text-danger-subtle-foreground">{payment.error instanceof ApiError ? payment.error.message : "Le paiement n'a pas pu démarrer. Réessayez."}</p>}

              <div className="border-t border-border pt-5">
                <div className="mb-4 flex items-center justify-between gap-4"><span className="text-sm text-muted">Total à payer</span><span className="font-mono text-xl font-semibold text-ink">{selected ? `${formatAmount(selected.price, selected.currency)} ${selected.currency}` : "—"}</span></div>
                <Button type="submit" size="lg" className="w-full" disabled={!planId || !provider || phone.replace(/\s/g, "").length < 8 || payment.isPending}>{payment.isPending ? "Préparation du paiement…" : `Payer avec ${provider ? PROVIDER_LABEL[provider] : "mobile money"}`}</Button>
                <p className="mt-3 text-center text-xs leading-5 text-muted">Vous serez redirigé vers le guichet sécurisé CinetPay pour confirmer.</p>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function TrustLine({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex items-center gap-3 text-sm text-inverse-foreground/75"><span className="[&>svg]:size-[18px] [&>svg]:text-primary-subtle">{icon}</span>{text}</div>; }
function PublicLoading() { return <main className="grid min-h-dvh place-items-center bg-canvas"><p className="text-sm text-muted">Ouverture du point de vente…</p></main>; }
function PublicError() { return <main className="grid min-h-dvh place-items-center bg-canvas px-5"><div className="max-w-sm text-center"><p className="font-semibold text-ink">Point de vente indisponible</p><p className="mt-2 text-sm text-muted">Vérifiez le lien reçu ou demandez un nouveau lien au responsable de la zone.</p></div></main>; }
