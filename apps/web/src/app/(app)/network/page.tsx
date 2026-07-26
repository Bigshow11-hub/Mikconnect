import Link from "next/link";

import { Button } from "@mikconnect/ui";
import { MonitoringLinksPanel } from "@/features/monitoring-links/monitoring-links-panel";
import { NetworkDiagnosticsPanel } from "@/features/network-operations/network-diagnostics-panel";
import { OnlineUsersPanel } from "@/features/routers/online-users-panel";
import { ZoneRoutersPanel } from "@/features/routers/zone-routers-panel";

export default function NetworkPage() {
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-ink sm:text-3xl">
            Centre réseau
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Surveillez les routeurs, comprenez les incidents et partagez uniquement les informations
            nécessaires.
          </p>
        </div>
        <Button asChild className="min-h-11">
          <Link href="/onboarding">Ajouter une zone</Link>
        </Button>
      </header>

      <NetworkDiagnosticsPanel />
      <section id="sessions" className="scroll-mt-24">
        <OnlineUsersPanel limit={12} />
      </section>
      <section id="zones" className="scroll-mt-24" aria-labelledby="network-zones-title">
        <h2 id="network-zones-title" className="text-lg font-semibold text-ink">
          Zones et routeurs
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted">Le parc configuré pour votre entreprise.</p>
        <ZoneRoutersPanel />
      </section>
      <MonitoringLinksPanel />
    </div>
  );
}
