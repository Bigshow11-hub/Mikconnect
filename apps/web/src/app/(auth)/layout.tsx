"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CheckCircle2, ShieldCheck, SignalHigh } from "@mikconnect/ui";
import { useAuth } from "@/features/auth/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace(user?.role === "AGENT" ? "/agent" : "/dashboard");
  }, [status, user, router]);

  return (
    <main className="relative min-h-dvh bg-canvas p-3 sm:p-5">
      <div className="absolute right-6 top-6 z-10"><ThemeToggle /></div>
      <div className="mx-auto grid min-h-[calc(100dvh-1.5rem)] max-w-7xl overflow-hidden rounded-2xl border border-border bg-bg sm:min-h-[calc(100dvh-2.5rem)] lg:grid-cols-[.88fr_1.12fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-inverse p-10 text-inverse-foreground lg:flex xl:p-14">
          <Link href="/" className="inline-flex items-center gap-3 text-[17px] font-semibold tracking-[-0.03em]"><span className="grid size-10 place-items-center rounded-lg bg-inverse-foreground font-mono text-sm text-inverse">mk</span>mik<span className="-ml-3 text-primary-subtle-foreground">connect</span></Link>
          <div className="max-w-md">
            <p className="font-mono text-sm text-primary-subtle">Le grand livre de votre zone WiFi</p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-[-0.04em] xl:text-5xl">Chaque franc vendu. Chaque zone sous contrôle.</h1>
            <p className="mt-5 text-base leading-7 text-inverse-foreground/60">Pilotez vos revenus, vos tickets et vos agents depuis un téléphone, sans ouvrir Winbox.</p>
          </div>
          <div className="space-y-4 border-t border-inverse-foreground/10 pt-6 text-sm text-inverse-foreground/70">
            <AuthProof icon={<SignalHigh />} text="Routeurs et zones suivis en direct" />
            <AuthProof icon={<CheckCircle2 />} text="Ventes et commissions réconciliées" />
            <AuthProof icon={<ShieldCheck />} text="Données isolées pour chaque entreprise" />
          </div>
          <div className="absolute bottom-0 right-0 h-40 w-1 bg-primary" />
        </section>
        <section className="flex min-w-0 flex-col">
          <header className="flex h-20 items-center px-6 lg:hidden"><Link href="/" className="inline-flex items-center gap-2.5 text-base font-semibold text-ink"><span className="grid size-8 place-items-center rounded-lg bg-inverse font-mono text-xs text-inverse-foreground">mk</span>mik<span className="-ml-2.5 text-primary">connect</span></Link></header>
          <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-10 lg:px-14">
            <div className="w-full max-w-md">{children}</div>
          </div>
          <footer className="px-6 py-5 text-center text-xs text-muted">© 2026 mikconnect · Conçu pour les zones WiFi de CI et de Guinée</footer>
        </section>
      </div>
    </main>
  );
}

function AuthProof({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-3"><span className="[&>svg]:size-[18px] [&>svg]:text-primary-subtle">{icon}</span>{text}</div>;
}
