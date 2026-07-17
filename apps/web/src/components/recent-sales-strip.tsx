"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ticket } from "@mikconnect/ui";

import { useAuth } from "@/features/auth/use-auth";
import { formatAmount } from "@/features/tickets/format";
import { ticketsApi } from "@/features/tickets/api";

export function RecentSalesStrip() {
  const { user } = useAuth();
  const [isNewSale, setIsNewSale] = useState(false);
  const latestSaleId = useRef<string>();

  const { data } = useQuery({
    queryKey: ["business-overview"],
    queryFn: ticketsApi.overview,
    enabled: user?.role === "OWNER",
    staleTime: 3_000,
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
  });

  const sales = useMemo(() => data?.recentSales.slice(0, 5) ?? [], [data?.recentSales]);

  useEffect(() => {
    const nextId = sales[0]?.id;
    if (!nextId) return;

    if (latestSaleId.current && latestSaleId.current !== nextId) {
      setIsNewSale(true);
      const timeout = window.setTimeout(() => setIsNewSale(false), 1_800);
      latestSaleId.current = nextId;
      return () => window.clearTimeout(timeout);
    }

    latestSaleId.current = nextId;
  }, [sales]);

  if (user?.role !== "OWNER" || sales.length === 0) return null;

  const currency = data?.currency ?? user.tenant.currency;

  return (
    <div
      className={`recent-sale-strip border-t border-border bg-surface ${isNewSale ? "recent-sale-strip--fresh" : ""}`}
      aria-label="Tickets récemment vendus"
    >
      <div className="recent-sale-strip__viewport h-11 overflow-hidden" aria-live="polite">
        <div className="recent-sale-strip__track flex h-full w-max items-center">
          <SalesSequence sales={sales} currency={currency} />
          <SalesSequence sales={sales} currency={currency} duplicate />
        </div>
      </div>
    </div>
  );
}

function SalesSequence({ sales, currency, duplicate = false }: { sales: NonNullable<Awaited<ReturnType<typeof ticketsApi.overview>>>["recentSales"]; currency: "XOF" | "GNF"; duplicate?: boolean }) {
  return (
    <div className="flex min-w-screen shrink-0 items-center justify-around gap-10 px-6" aria-hidden={duplicate || undefined}>
      {sales.map((sale) => {
        const channel = sale.channel === "MOBILE_MONEY" ? "Paiement en ligne" : "Vente physique";
        return (
          <div key={sale.id} className="flex shrink-0 items-center gap-3 text-xs">
            <span className="relative grid size-7 place-items-center rounded-full bg-success-subtle text-success-strong">
              <Ticket className="size-3.5" aria-hidden="true" />
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-success ring-2 ring-surface" />
            </span>
            <span className="font-medium text-muted-strong">Vente en direct</span>
            <span className="h-4 w-px bg-border" aria-hidden="true" />
            <span className="font-mono font-semibold text-ink">{sale.ticket.code}</span>
            <span className="text-muted-strong">{sale.ticket.plan.name}</span>
            <span className="hidden text-muted-strong sm:inline">{channel}</span>
            <span className="font-mono font-semibold tabular-nums text-success-strong">
              +{formatAmount(sale.amount, currency)} {currency}
            </span>
          </div>
        );
      })}
    </div>
  );
}
