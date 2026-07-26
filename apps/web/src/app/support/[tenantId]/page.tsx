"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Badge, Button, Field, Input, KeyRound, Send, ShieldCheck, toast } from "@mikconnect/ui";

import { ThemeToggle } from "@/components/theme-toggle";
import { ticketSupportApi, type TicketSupportResult } from "@/features/ticket-support/api";
import { formatAmount, formatDuration } from "@/features/tickets/format";
import { ApiError } from "@/lib/api";

export default function TicketSupportPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [reference, setReference] = useState("");
  const [phone, setPhone] = useState("");
  const lookup = useMutation({
    mutationFn: () => ticketSupportApi.lookup(tenantId, { reference, phone }),
  });
  const resend = useMutation({
    mutationFn: () => ticketSupportApi.resend(tenantId, { reference, phone }),
    onSuccess: (result) => toast.success("SMS envoyé", { description: result.message }),
    onError: (error) =>
      toast.error("Renvoi impossible", {
        description: error instanceof ApiError ? error.message : "Réessayez plus tard.",
      }),
  });

  return (
    <main className="min-h-dvh bg-canvas px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <ShieldCheck className="size-4" />
              Assistance sécurisée
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-ink sm:text-3xl">
              Retrouver mon ticket WiFi
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Utilisez le code WiFi ou la référence de paiement, puis confirmez le numéro ayant
              servi à l’achat.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <form
          className="mt-7 dashboard-panel p-5"
          onSubmit={(event) => {
            event.preventDefault();
            lookup.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code ou référence de paiement" htmlFor="support-reference" required>
              <Input
                id="support-reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                autoCapitalize="characters"
                autoComplete="off"
                required
              />
            </Field>
            <Field label="Numéro utilisé pour payer" htmlFor="support-phone" required>
              <Input
                id="support-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </Field>
          </div>
          {lookup.error && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-danger-subtle px-4 py-3 text-sm text-danger-subtle-foreground"
            >
              {lookup.error instanceof ApiError
                ? lookup.error.message
                : "La vérification a échoué."}
            </p>
          )}
          <div className="mt-5 flex justify-end">
            <Button
              type="submit"
              className="min-h-11"
              disabled={
                reference.trim().length < 4 ||
                phone.replace(/\D/g, "").length < 8 ||
                lookup.isPending
              }
            >
              {lookup.isPending ? "Vérification…" : "Vérifier mon ticket"}
            </Button>
          </div>
        </form>

        {lookup.data && (
          <TicketResult
            data={lookup.data}
            resend={() => resend.mutate()}
            pending={resend.isPending}
          />
        )}
      </div>
    </main>
  );
}

function TicketResult({
  data,
  resend,
  pending,
}: {
  data: TicketSupportResult;
  resend: () => void;
  pending: boolean;
}) {
  const provisioningTone =
    data.ticket.provisioningStatus === "SYNCED"
      ? "success"
      : data.ticket.provisioningStatus === "FAILED"
        ? "danger"
        : "warning";
  return (
    <section
      className="mt-6 overflow-hidden rounded-xl bg-inverse text-inverse-foreground"
      aria-live="polite"
    >
      <div className="border-b border-inverse-foreground/10 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-inverse-foreground/65">Code WiFi vérifié</p>
            <p className="mt-2 select-all font-mono text-3xl font-semibold tracking-[0.08em]">
              {data.ticket.code}
            </p>
          </div>
          <Badge tone={provisioningTone}>
            {data.ticket.provisioningStatus === "SYNCED"
              ? "Synchronisé"
              : data.ticket.provisioningStatus === "FAILED"
                ? "À réparer"
                : "En attente"}
          </Badge>
        </div>
      </div>
      <div className="grid gap-px bg-inverse-foreground/10 sm:grid-cols-2">
        <ResultDatum label="Forfait" value={data.ticket.plan.name} />
        <ResultDatum label="Durée" value={formatDuration(data.ticket.plan.durationMinutes)} />
        <ResultDatum
          label="Prix"
          value={`${formatAmount(data.ticket.plan.price, data.ticket.plan.currency)} ${data.ticket.plan.currency}`}
        />
        <ResultDatum label="Données utilisées" value={`${data.ticket.usage.dataUsedMb} Mo`} />
      </div>
      <div className="px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 size-5 shrink-0 text-primary-subtle" />
          <p className="text-sm leading-6 text-inverse-foreground/75">{data.guidance}</p>
        </div>
        <Button
          variant="outline"
          className="mt-5 min-h-11 border-inverse-foreground/20 bg-transparent text-inverse-foreground hover:bg-inverse-foreground/10 hover:text-inverse-foreground"
          disabled={pending}
          onClick={resend}
        >
          <Send />
          {pending ? "Envoi…" : "Renvoyer le code par SMS"}
        </Button>
      </div>
    </section>
  );
}
function ResultDatum({ label, value }: { label: string; value: string }) {
  return (
    <dl className="bg-inverse px-5 py-4 sm:px-6">
      <dt className="text-sm text-inverse-foreground/55">{label}</dt>
      <dd className="mt-1 font-mono text-base font-semibold">{value}</dd>
    </dl>
  );
}
