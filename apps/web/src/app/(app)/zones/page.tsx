import Link from "next/link";

import { Button } from "@mikconnect/ui";
import { OnlineUsersPanel } from "@/features/routers/online-users-panel";
import { ZoneRoutersPanel } from "@/features/routers/zone-routers-panel";

export default function ZonesPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Réseau WiFi</h1>
          <p className="text-sm text-muted">Connexions actives, zones et routeurs MikroTik.</p>
        </div>
        <Button asChild>
          <Link href="/onboarding">Ajouter une zone</Link>
        </Button>
      </div>

      <OnlineUsersPanel />

      <section aria-labelledby="zones-title">
        <div className="mb-4">
          <h2 id="zones-title" className="text-lg font-semibold tracking-tight text-ink">Zones et routeurs</h2>
          <p className="text-sm text-muted">Le parc configuré pour votre entreprise.</p>
        </div>
        <ZoneRoutersPanel />
      </section>
    </div>
  );
}
