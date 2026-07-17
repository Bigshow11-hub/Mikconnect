"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, toast } from "@mikconnect/ui";
import { ApiError } from "@/lib/api";
import { ticketsApi } from "@/features/tickets/api";
import { salesApi } from "@/features/agents/api";
import {
  formatCurrency,
  formatDuration,
  ticketStatusLabel,
  ticketStatusTone,
} from "@/features/tickets/format";

/**
 * /tickets/:id — mikconnect.
 *
 * Détail d'un ticket + feuille d'impression (QR code, format imprimable).
 * Le QR contient le code ticket — le client le scanne sur la page de login
 * hotspot (ou l'agent le saisit). Le code est aussi affiché en gros mono.
 *
 * Impression : `@media print` cache le chrome applicatif (header nav, boutons)
 * et ne garde que la feuille de ticket. Le QR est généré côté client (offline,
 * pas de service externe — important en 3G).
 */
export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", params.id],
    queryFn: () => ticketsApi.findOne(params.id),
    enabled: !!params.id,
  });

  const sellMutation = useMutation({
    mutationFn: () => {
      if (!ticket) throw new Error("Ticket non chargé");
      return salesApi.sellTicket(ticket.id, ticket.agent?.id);
    },
    onSuccess: (result) => {
      toast.success("Ticket vendu", {
        description: `${result.sale.amount} XOF${result.sale.commission > 0 ? ` · Commission ${result.sale.commission} XOF` : ""}`,
      });
      queryClient.invalidateQueries({ queryKey: ["ticket", params.id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
    },
    onError: (err) => {
      toast.error("Vente impossible", {
        description: err instanceof ApiError ? err.message : "Réessayez.",
      });
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted">Chargement du ticket…</p>;
  }

  if (!ticket) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">Ticket introuvable.</p>
        <Button asChild variant="outline">
          <Link href="/tickets">Retour aux tickets</Link>
        </Button>
      </div>
    );
  }

  const statusTone = ticketStatusTone[ticket.status] ?? "neutral";

  return (
    <div className="flex flex-col gap-6">
      {/* Chrome applicatif — caché à l'impression */}
      <div className="print:hidden flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Ticket</h1>
            <p className="text-sm text-muted">Détail et impression</p>
          </div>
          <div className="flex items-center gap-2">
            {ticket.status === "ISSUED" && (
              <Button
                onClick={() => sellMutation.mutate()}
                disabled={sellMutation.isPending}
              >
                {sellMutation.isPending ? "Vente…" : "Vendre le ticket"}
              </Button>
            )}
            <Button variant="outline" onClick={() => window.print()}>
              Imprimer
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/tickets" className="text-sm text-muted hover:text-ink hover:underline">
            ← Tous les tickets
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Row label="Code" value={<span className="font-mono text-base font-medium">{ticket.code}</span>} />
            <Row
              label="Statut"
              value={
                <Badge tone={statusTone} dot>
                  {ticketStatusLabel[ticket.status] ?? ticket.status}
                </Badge>
              }
            />
            <Row label="Forfait" value={ticket.plan.name} />
            <Row label="Durée" value={formatDuration(ticket.plan.durationMinutes)} />
            <Row label="Prix" value={formatCurrency(ticket.plan.price, ticket.plan.currency)} />
            {ticket.plan.dataLimitMb && (
              <Row label="Limite data" value={`${ticket.plan.dataLimitMb} Mo`} />
            )}
            {ticket.agent && (
              <Row label="Agent" value={ticket.agent.user.name} />
            )}
            <Row label="Créé le" value={new Date(ticket.createdAt).toLocaleString("fr-FR")} />
            {ticket.expiresAt && (
              <Row label="Expire le" value={new Date(ticket.expiresAt).toLocaleString("fr-FR")} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feuille d'impression — visible seulement à l'impression */}
      <PrintSheet
        code={ticket.code}
        planName={ticket.plan.name}
        duration={formatDuration(ticket.plan.durationMinutes)}
        price={formatCurrency(ticket.plan.price, ticket.plan.currency)}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm text-ink">{value}</span>
    </div>
  );
}

/**
 * Feuille d'impression du ticket.
 * En screen : cachée (print:hidden). En print : seule chose visible.
 * Format : code en gros mono + QR code + infos forfait.
 */
function PrintSheet({
  code,
  planName,
  duration,
  price,
}: {
  code: string;
  planName: string;
  duration: string;
  price: string;
}) {
  return (
    <div className="hidden print:flex print:flex-col print:items-center print:gap-6 print:py-12">
      <div className="text-center">
        <p className="text-sm font-medium text-ink">mikconnect</p>
        <p className="text-xs text-muted">Ticket WiFi</p>
      </div>

      <QRCodeSVG value={code} size={180} level="M" />

      <div className="text-center">
        <p className="font-mono text-2xl font-semibold tracking-[0.05em] text-ink">{code}</p>
      </div>

      <div className="flex flex-col gap-1 text-center">
        <p className="text-sm font-medium text-ink">{planName}</p>
        <p className="text-sm text-muted">{duration}</p>
        <p className="font-mono text-sm text-ink">{price}</p>
      </div>

      <p className="text-xs text-muted">
        Saisissez ce code sur la page de connexion WiFi pour accéder à internet.
      </p>
    </div>
  );
}
