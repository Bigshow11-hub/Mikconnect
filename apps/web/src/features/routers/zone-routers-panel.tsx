"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Badge, Button } from "@mikconnect/ui";
import { zonesApi } from "@/features/onboarding/api";

type RouterStatus = "ONLINE" | "OFFLINE" | "ERROR";

const STATUS_TONE: Record<RouterStatus, "success" | "neutral" | "danger"> = {
  ONLINE: "success",
  OFFLINE: "neutral",
  ERROR: "danger",
};

const STATUS_LABEL: Record<RouterStatus, string> = {
  ONLINE: "En ligne",
  OFFLINE: "Hors ligne",
  ERROR: "Erreur",
};

/**
 * ZoneRoutersPanel — mikconnect.
 *
 * Affiche les zones du tenant et, pour chacune, les routeurs appairés avec
 * leur statut (jamais la couleur seule — Badge + libellé + pastille).
 * Réutilisé par le dashboard et la page /zones.
 */
export function ZoneRoutersPanel() {
  const { data: zones, isLoading } = useQuery({
    queryKey: ["zones-with-routers"],
    queryFn: zonesApi.findAll,
  });

  if (isLoading) {
    return <p className="text-sm text-muted">Chargement de vos zones…</p>;
  }

  if (!zones || zones.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface px-4 py-8">
        <p className="text-sm text-muted">Aucune zone pour le moment.</p>
        <Button asChild>
          <Link href="/onboarding">Configurer ma première zone</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {zones.map((zone) => (
        <div
          key={zone.id}
          className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-semibold tracking-tight text-ink">{zone.name}</span>
              {zone.location && <span className="text-sm text-muted">{zone.location}</span>}
            </div>
          </div>

          {zone.routers && zone.routers.length > 0 ? (
            <ul className="flex flex-col gap-2 border-t border-border pt-3">
              {zone.routers.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-ink">{r.label}</span>
                    <span className="font-mono text-xs text-muted">{r.host}</span>
                  </div>
                  <Badge tone={STATUS_TONE[r.status]} dot>
                    {STATUS_LABEL[r.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-t border-border pt-3 text-sm text-muted">
              Aucun routeur appairé.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
