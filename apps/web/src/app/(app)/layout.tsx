"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, Bell, Button, CircleHelp, CreditCard, House, LogOut, Search, Settings, Ticket, Users, Wifi, toast } from "@mikconnect/ui";
import { logout, useAuth } from "@/features/auth/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";

const ownerNavItems = [
  { href: "/dashboard", label: "Vue d’ensemble", shortLabel: "Accueil", icon: House },
  { href: "/online", label: "Utilisateurs en ligne", shortLabel: "En ligne", icon: Activity },
  { href: "/tickets", label: "Tickets", shortLabel: "Tickets", icon: Ticket },
  { href: "/agents", label: "Agents", shortLabel: "Agents", icon: Users },
  { href: "/zones", label: "Réseau WiFi", shortLabel: "Réseau", icon: Wifi },
  { href: "/payments", label: "Paiements", shortLabel: "Payer", icon: CreditCard },
] as const;
const agentNavItems = [{ href: "/agent", label: "Mes tickets", shortLabel: "Tickets", icon: Ticket }] as const;

function Brand() {
  return <Link href="/dashboard" className="inline-flex items-center gap-3" aria-label="mikconnect — accueil"><span className="grid size-9 place-items-center rounded-lg bg-primary font-mono text-xs font-bold text-primary-foreground">mk</span><span className="text-base font-extrabold tracking-[-0.035em] text-ink">mik<span className="text-primary">connect</span></span></Link>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => { if (status === "unauthenticated") router.replace("/login"); }, [status, router]);
  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    if (user.role === "AGENT" && !pathname.startsWith("/agent") && pathname !== "/profile") router.replace("/agent");
    if (user.role !== "AGENT" && pathname.startsWith("/agent")) router.replace("/dashboard");
  }, [pathname, router, status, user]);

  async function handleLogout() { await logout(); toast.success("Session fermée"); router.replace("/login"); }
  if (status === "loading") return <div className="grid min-h-dvh place-items-center bg-canvas"><span className="text-sm text-muted">Ouverture de votre espace…</span></div>;
  if (status === "unauthenticated") return null;

  const initials = user?.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const navItems = user?.role === "AGENT" ? agentNavItems : ownerNavItems;
  const mobileNavItems = user?.role === "AGENT" ? agentNavItems : ownerNavItems.filter((item) => item.href !== "/online");

  return (
    <div className="min-h-dvh bg-canvas md:grid md:grid-cols-[188px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh border-r border-border bg-bg md:flex md:flex-col">
        <div className="flex h-16 items-center px-5"><Brand /></div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Navigation principale">
          {navItems.map((item) => { const active = pathname === item.href || pathname.startsWith(`${item.href}/`); const Icon = item.icon; return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex h-10 items-center gap-3 rounded-lg px-3 text-xs font-semibold transition-colors ${active ? "bg-primary-subtle text-primary-subtle-foreground" : "text-muted-strong hover:bg-surface hover:text-ink"}`}><Icon className="size-4" />{item.label}</Link>; })}
        </nav>
        <div className="border-t border-border p-3">
          <Link href="/profile" className="flex h-10 items-center gap-3 rounded-lg px-3 text-xs font-semibold text-muted-strong hover:bg-surface hover:text-ink"><Settings className="size-4" />Paramètres</Link>
          <Link href="/help" className="flex h-10 items-center gap-3 rounded-lg px-3 text-xs font-semibold text-muted-strong hover:bg-surface hover:text-ink"><CircleHelp className="size-4" />Aide & support</Link>
          <div className="mt-3 rounded-xl bg-primary p-3 text-primary-foreground">
            <p className="text-xs font-bold">{user?.tenant.name}</p><p className="mt-1 text-[10px] text-primary-foreground/70">Espace {user?.tenant.tier ?? "FREE"}</p>
          </div>
          <button onClick={handleLogout} className="mt-2 flex h-9 w-full items-center gap-3 rounded-lg px-3 text-xs text-muted hover:bg-danger-subtle hover:text-danger-subtle-foreground"><LogOut className="size-4" />Déconnexion</button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-border bg-bg">
          <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-5">
            <div className="md:hidden"><Brand /></div>
            <label className="hidden h-9 w-full max-w-sm items-center gap-2 rounded-lg bg-surface px-3 text-muted md:flex"><Search className="size-4" /><input className="min-w-0 flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-muted" placeholder="Rechercher un ticket, un agent, une zone…" aria-label="Recherche globale" /></label>
            <div className="flex items-center gap-1"><ThemeToggle /><Button variant="ghost" size="icon-sm" aria-label="Notifications"><Bell className="size-4" /></Button><Link href="/profile" className="ml-1 grid size-9 place-items-center rounded-full bg-inverse text-[11px] font-bold text-inverse-foreground" aria-label="Profil">{initials || "MK"}</Link></div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1320px] px-4 pb-24 pt-5 md:px-5 md:pb-10">{children}</main>
      </div>

      <nav className={`fixed inset-x-0 bottom-0 z-40 grid border-t border-border bg-bg px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 md:hidden ${user?.role === "AGENT" ? "grid-cols-1" : "grid-cols-5"}`} aria-label="Navigation mobile">
        {mobileNavItems.map((item) => { const active = pathname === item.href || pathname.startsWith(`${item.href}/`); const Icon = item.icon; return <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1 py-2 text-xs font-semibold ${active ? "text-primary" : "text-muted"}`}><Icon className="size-5" />{item.shortLabel}</Link>; })}
      </nav>
    </div>
  );
}
