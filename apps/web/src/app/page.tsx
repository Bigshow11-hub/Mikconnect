"use client";

import Link from "next/link";
import { Button } from "@mikconnect/ui";
import { useAuth } from "@/features/auth/use-auth";

const sources = [
  {
    name: "RouterOS",
    role: "Sessions, appareils et trafic du routeur",
    state: "À connecter",
  },
  {
    name: "Mobile money",
    role: "Paiements confirmés par le fournisseur",
    state: "À configurer",
  },
  {
    name: "RADIUS",
    role: "Durées, quotas et consommation réelle",
    state: "À connecter",
  },
  {
    name: "PostgreSQL",
    role: "Ventes, tickets, agents et historique",
    state: "Prêt",
  },
] as const;

function Brand() {
  return (
    <span className="text-lg font-semibold tracking-[-0.025em]" aria-label="mikconnect">
      <span className="text-ink">mik</span>
      <span className="text-primary">connect</span>
    </span>
  );
}

function Nav() {
  const { status } = useAuth();
  const authed = status === "authenticated";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Brand />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Navigation principale">
          <Link
            href="#capacites"
            className="text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Ce que vous pilotez
          </Link>
          <Link
            href="#mise-en-service"
            className="text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Mise en service
          </Link>
          <Link
            href="#confiance"
            className="text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Données réelles
          </Link>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {authed ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Ouvrir le tableau de bord</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Se connecter</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">
                  <span className="sm:hidden">Commencer</span>
                  <span className="hidden sm:inline">Créer mon espace</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function DataSourcePanel() {
  return (
    <div className="landing-reveal landing-reveal-delay relative overflow-hidden rounded-[14px] bg-inverse text-inverse-foreground">
      <div className="flex items-start justify-between gap-4 border-b border-white/15 px-5 py-5 sm:px-6">
        <div>
          <p className="text-sm font-semibold">Sources de votre activité</p>
          <p className="mt-1 max-w-sm text-sm leading-relaxed text-white/70">
            Le tableau de bord reste vide tant qu’une source réelle n’a pas répondu.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/20 px-2.5 py-1 text-xs font-medium text-white/80">
          Zéro simulation
        </span>
      </div>

      <div className="divide-y divide-white/10">
        {sources.map((source) => (
          <div key={source.name} className="group flex items-center gap-4 px-5 py-4 sm:px-6">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-white/10 font-mono text-xs font-semibold text-white">
              {source.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{source.name}</p>
              <p className="mt-0.5 text-sm leading-snug text-white/65">{source.role}</p>
            </div>
            <span
              className={`hidden shrink-0 text-xs font-medium sm:inline ${source.state === "Prêt" ? "text-emerald-300" : "text-white/55"}`}
            >
              {source.state}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-white/15 bg-black/10 px-5 py-4 sm:px-6">
        <p className="text-xs leading-relaxed text-white/65">
          Montants, utilisateurs en ligne et durées proviennent uniquement de vos intégrations.
        </p>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="overflow-hidden border-b border-border bg-bg">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-16 lg:py-28">
        <div className="landing-reveal flex max-w-2xl flex-col items-start">
          <div className="inline-flex min-h-8 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-medium text-muted-strong">
            <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
            Conçu pour les zones WiFi en CI et en Guinée
          </div>

          <h1 className="mt-7 text-balance text-[clamp(2.5rem,7vw,5.25rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-ink">
            Votre zone WiFi. Vos ventes. <span className="text-primary">Les vrais chiffres.</span>
          </h1>

          <p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-muted-strong sm:text-xl">
            mikconnect réunit les tickets, les paiements, les agents et les sessions MikroTik dans
            un registre clair — sans inventer une seule donnée.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg" className="min-h-12 sm:min-w-48">
              <Link href="/register">Connecter ma première zone</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="min-h-12 sm:min-w-36">
              <Link href="/login">Me connecter</Link>
            </Button>
          </div>

          <p className="mt-5 max-w-lg text-sm leading-6 text-muted">
            Aucun revenu, ticket vendu ou utilisateur connecté n’est affiché avant confirmation de
            la source correspondante.
          </p>
        </div>

        <DataSourcePanel />
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section id="confiance" className="scroll-mt-20 border-b border-border bg-surface">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 divide-y divide-border px-4 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:px-6 lg:grid-cols-4">
        {[
          ["Ventes", "Confirmées avant comptabilisation"],
          ["Sessions", "Lues directement sur le réseau"],
          ["Paiements", "Vérifiés côté fournisseur"],
          ["Accès", "Séparés pour chaque propriétaire"],
        ].map(([label, detail]) => (
          <div key={label} className="py-5 sm:px-5 sm:py-7 first:sm:pl-0 last:sm:pr-0">
            <p className="text-sm font-semibold text-ink">{label}</p>
            <p className="mt-1 text-sm leading-6 text-muted">{detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Capabilities() {
  return (
    <section id="capacites" className="scroll-mt-20 border-b border-border">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <h2 className="max-w-md text-balance text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">
              Un seul registre pour suivre ce qui rapporte et ce qui consomme.
            </h2>
            <p className="mt-5 max-w-md text-pretty text-base leading-7 text-muted-strong">
              Le propriétaire voit d’abord l’état de son activité. La complexité RouterOS, RADIUS et
              paiement reste sous le capot.
            </p>
          </div>

          <div className="divide-y divide-border border-y border-border">
            {[
              {
                index: "01",
                title: "Piloter le revenu confirmé",
                copy: "Chaque vente physique ou mobile money rejoint le même historique, avec son canal, son ticket et son statut de règlement.",
              },
              {
                index: "02",
                title: "Voir les utilisateurs réellement en ligne",
                copy: "Adresse IP, MAC, durée, trafic et temps restant sont lus depuis le routeur connecté. Déconnexion et blocage restent des actions explicites.",
              },
              {
                index: "03",
                title: "Rapprocher les tickets et leur usage",
                copy: "Les tickets générés, vendus et utilisés sont comparés pour rendre les écarts visibles sans noyer l’écran d’alertes.",
              },
            ].map((item) => (
              <article
                key={item.index}
                className="grid gap-3 py-7 sm:grid-cols-[4rem_1fr] sm:gap-5 sm:py-9"
              >
                <span className="font-mono text-sm font-semibold text-primary">{item.index}</span>
                <div>
                  <h3 className="text-balance text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">
                    {item.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-pretty text-base leading-7 text-muted-strong">
                    {item.copy}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SetupFlow() {
  const steps = [
    ["1", "Créer l’espace", "Renseignez votre activité et vos zones sans jargon technique."],
    [
      "2",
      "Relier les sources",
      "Connectez le routeur, le paiement et le suivi RADIUS avec des contrôles explicites.",
    ],
    [
      "3",
      "Ouvrir l’exploitation",
      "Le tableau de bord commence à afficher les données uniquement après leur première synchronisation.",
    ],
  ] as const;

  return (
    <section id="mise-en-service" className="scroll-mt-20 border-b border-border bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-2xl">
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">
            Une mise en service lisible, étape par étape.
          </h2>
          <p className="mt-4 text-pretty text-base leading-7 text-muted-strong sm:text-lg">
            Chaque connexion est testée avant d’alimenter le tableau de bord.
          </p>
        </div>

        <ol className="mt-10 grid overflow-hidden rounded-[14px] border border-border bg-bg lg:grid-cols-3 lg:divide-x lg:divide-y-0 divide-y divide-border">
          {steps.map(([number, title, detail]) => (
            <li key={number} className="flex min-h-52 flex-col p-6 sm:p-8">
              <span className="font-mono text-sm font-semibold text-primary">{number}</span>
              <h3 className="mt-8 text-xl font-semibold tracking-[-0.02em] text-ink">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-strong">{detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="bg-inverse text-inverse-foreground">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-sm font-medium text-white/65">
            Votre activité, sans chiffres inventés
          </p>
          <h2 className="mt-3 max-w-3xl text-balance text-3xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
            Connectez votre zone. Le registre s’occupe du reste.
          </h2>
        </div>
        <Button asChild size="lg" className="min-h-12 w-full lg:w-auto">
          <Link href="/register">Créer mon espace</Link>
        </Button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-bg">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/" className="inline-flex min-h-11 items-center">
            <Brand />
          </Link>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">
            Pilotage des zones WiFi, ventes de tickets et suivi réseau pour la Côte d’Ivoire et la
            Guinée.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-muted">
          <Link href="/login" className="min-h-11 py-3 transition-colors hover:text-ink">
            Se connecter
          </Link>
          <Link href="/register" className="min-h-11 py-3 transition-colors hover:text-ink">
            Créer un compte
          </Link>
          <Link href="/help" className="min-h-11 py-3 transition-colors hover:text-ink">
            Aide
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Nav />
      <main className="flex-1">
        <Hero />
        <TrustStrip />
        <Capabilities />
        <SetupFlow />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
