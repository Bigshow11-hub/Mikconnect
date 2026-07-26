import Link from "next/link";
import { ChevronRight, CircleHelp, CreditCard, FileDown, Settings } from "@mikconnect/ui";

const destinations = [
  {
    href: "/payments",
    title: "Paiements",
    detail: "Transactions mobile money et livraison des tickets.",
    icon: CreditCard,
  },
  {
    href: "/reports",
    title: "Rapports",
    detail: "Synthèses mensuelles, PDF et exports comptables.",
    icon: FileDown,
  },
  {
    href: "/help",
    title: "Aide et support",
    detail: "Résoudre un problème de ticket, paiement ou routeur.",
    icon: CircleHelp,
  },
  {
    href: "/profile",
    title: "Paramètres",
    detail: "Profil, abonnement et export des données.",
    icon: Settings,
  },
] as const;

export default function MorePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="border-b border-border pb-6">
        <h1 className="text-2xl font-semibold text-ink">Plus</h1>
        <p className="mt-2 text-sm text-muted">Paiements, rapports, aide et paramètres.</p>
      </header>
      <nav className="divide-y divide-border" aria-label="Autres sections">
        {destinations.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-16 items-center gap-4 py-4"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted-strong">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{item.title}</span>
                <span className="mt-1 block text-sm text-muted">{item.detail}</span>
              </span>
              <ChevronRight className="size-4 text-muted" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
