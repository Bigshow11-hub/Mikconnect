import Link from "next/link";

import { Button, ChevronRight, CircleHelp, CreditCard, Router, Ticket } from "@mikconnect/ui";

const guides = [
  {
    href: "/zones",
    icon: Router,
    title: "Vérifier le réseau WiFi",
    detail: "État du routeur, utilisateurs connectés et actions de session.",
  },
  {
    href: "/tickets/new",
    icon: Ticket,
    title: "Créer et imprimer des tickets",
    detail: "Génération de lots, longueur des codes et export PDF.",
  },
  {
    href: "/payments",
    icon: CreditCard,
    title: "Contrôler les paiements",
    detail: "Transactions mobile money, statuts et livraison du ticket.",
  },
] as const;

const questions = [
  {
    question: "Un utilisateur n’arrive pas à se connecter",
    answer:
      "Vérifiez d’abord que son ticket est vendu et non expiré, puis ouvrez Réseau WiFi pour contrôler l’état du routeur. Une session déjà active peut aussi consommer la limite d’appareils du ticket.",
  },
  {
    question: "Une vente n’apparaît pas sur le dashboard",
    answer:
      "Actualisez la page Paiements pour contrôler le statut. Une vente mobile money n’est comptabilisée qu’après confirmation du fournisseur ; une vente physique doit être confirmée par le propriétaire ou l’agent.",
  },
  {
    question: "Le routeur est indiqué hors ligne",
    answer:
      "Confirmez que le routeur a Internet, que le service API RouterOS est actif et que l’adresse du serveur mikconnect est autorisée. Les tickets déjà poussés au routeur restent utilisables pendant la coupure.",
  },
] as const;

export default function HelpPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-9">
      <header className="border-b border-border pb-6">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-subtle text-primary-subtle-foreground">
            <CircleHelp className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-ink sm:text-3xl">
              Centre d’aide
            </h1>
            <p className="mt-2 max-w-[65ch] text-sm leading-6 text-muted">
              Retrouvez les contrôles essentiels pour résoudre rapidement un problème de ticket, de
              paiement ou de routeur.
            </p>
          </div>
        </div>
      </header>

      <section aria-labelledby="help-guides-title">
        <h2 id="help-guides-title" className="text-lg font-semibold text-ink">
          Accès rapides
        </h2>
        <div className="mt-3 divide-y divide-border border-y border-border">
          {guides.map((guide) => {
            const Icon = guide.icon;
            return (
              <Link
                key={guide.href}
                href={guide.href}
                className="group flex items-center gap-4 py-4 transition-colors hover:bg-surface-2 sm:px-3"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted-strong group-hover:bg-primary-subtle group-hover:text-primary-subtle-foreground">
                  <Icon className="size-[18px]" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{guide.title}</span>
                  <span className="mt-1 block text-sm leading-5 text-muted">{guide.detail}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="help-questions-title">
        <h2 id="help-questions-title" className="text-lg font-semibold text-ink">
          Résoudre un problème courant
        </h2>
        <div className="mt-3 divide-y divide-border border-y border-border">
          {questions.map((item) => (
            <details key={item.question} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronRight className="size-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-90" />
              </summary>
              <p className="max-w-[70ch] pb-1 pt-3 text-sm leading-6 text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="flex flex-col justify-between gap-4 rounded-[10px] bg-inverse px-5 py-5 text-inverse-foreground sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-semibold">Le problème persiste ?</h2>
          <p className="mt-1 text-sm text-inverse-foreground/65">
            Notez le code du ticket, l’heure du problème et le nom du routeur avant de demander de
            l’aide.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="shrink-0 border-inverse-foreground/20 bg-transparent text-inverse-foreground hover:bg-inverse-foreground/10 hover:text-inverse-foreground"
        >
          <Link href="/profile">Voir mon profil</Link>
        </Button>
      </section>
    </div>
  );
}
