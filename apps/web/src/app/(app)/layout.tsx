"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CircleHelp,
  CreditCard,
  FileDown,
  House,
  LogOut,
  Settings,
  ShieldCheck,
  SignalHigh,
  Ticket,
  Users,
  Wifi,
  Ellipsis,
  toast,
} from "@mikconnect/ui";
import { logout, useAuth } from "@/features/auth/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";

const ownerNavItems = [
  { href: "/dashboard", label: "Vue d’ensemble", shortLabel: "Accueil", icon: House },
  { href: "/tickets", label: "Tickets", shortLabel: "Tickets", icon: Ticket },
  { href: "/network", label: "Centre réseau", shortLabel: "Réseau", icon: Wifi },
  { href: "/agents", label: "Agents", shortLabel: "Agents", icon: Users },
  { href: "/payments", label: "Paiements", shortLabel: "Payer", icon: CreditCard },
  { href: "/reports", label: "Rapports", shortLabel: "Rapports", icon: FileDown },
] as const;
const ownerMobileNavItems = [
  ownerNavItems[0],
  ownerNavItems[1],
  ownerNavItems[2],
  ownerNavItems[3],
  { href: "/more", label: "Plus", shortLabel: "Plus", icon: Ellipsis },
] as const;
const agentNavItems = [
  { href: "/agent", label: "Mes tickets", shortLabel: "Tickets", icon: Ticket },
] as const;

function Brand() {
  return (
    <Link
      href="/dashboard"
      className="group inline-flex min-h-11 items-center gap-3"
      aria-label="mikconnect — accueil"
    >
      <span className="relative grid size-10 place-items-center overflow-hidden rounded-xl bg-inverse text-inverse-foreground transition-colors duration-200 group-hover:bg-primary">
        <span className="absolute inset-x-1.5 top-1.5 h-px rounded-full bg-primary-foreground/35" />
        <span className="absolute bottom-1.5 left-1.5 h-1.5 w-4 rounded-full bg-accent" />
        <SignalHigh className="relative size-5" strokeWidth={2.4} />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[0.95rem] font-extrabold tracking-[-0.025em] text-ink">
          mik<span className="text-primary">connect</span>
        </span>
        <span className="mt-1 hidden text-[0.62rem] font-semibold text-muted-strong md:block">
          réseau · tickets · revenus
        </span>
      </span>
    </Link>
  );
}

function PremiumTenantCard({ name, tier }: { name: string | undefined; tier: string | undefined }) {
  return (
    <div className="rounded-xl border border-primary-subtle bg-primary-subtle p-3 text-primary-subtle-foreground">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-ink">{name}</p>
          <p className="mt-1 text-xs font-medium">Espace {tier ?? "FREE"}</p>
        </div>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-bg text-primary">
          <ShieldCheck className="size-4" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted-strong">
        <span className="size-1.5 rounded-full bg-success" />
        Contrôle actif
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);
  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    if (user.role === "AGENT" && !pathname.startsWith("/agent") && pathname !== "/profile")
      router.replace("/agent");
    if (user.role !== "AGENT" && pathname.startsWith("/agent")) router.replace("/dashboard");
  }, [pathname, router, status, user]);

  async function handleLogout() {
    await logout();
    toast.success("Session fermée");
    router.replace("/login");
  }
  if (status === "loading")
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas">
        <span className="text-sm text-muted">Ouverture de votre espace…</span>
      </div>
    );
  if (status === "unauthenticated") return null;

  const initials = user?.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const navItems = user?.role === "AGENT" ? agentNavItems : ownerNavItems;
  const mobileNavItems = user?.role === "AGENT" ? agentNavItems : ownerMobileNavItems;

  return (
    <div className="min-h-dvh bg-canvas md:grid md:grid-cols-[204px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh border-r border-border bg-surface md:flex md:flex-col">
        <div className="flex h-[68px] items-center px-5">
          <Brand />
        </div>
        <nav className="flex flex-1 flex-col gap-1.5 px-3 py-4" aria-label="Navigation principale">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-11 items-center gap-3 rounded-lg px-3 text-xs font-semibold transition-colors duration-200 ${active ? "border border-primary-subtle bg-bg text-primary-subtle-foreground" : "text-muted-strong hover:bg-bg hover:text-ink"}`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <Link
            href="/profile"
            className="flex h-11 items-center gap-3 rounded-lg px-3 text-xs font-semibold text-muted-strong transition-colors hover:bg-bg hover:text-ink"
          >
            <Settings className="size-4" />
            Paramètres
          </Link>
          <Link
            href="/help"
            className="flex h-11 items-center gap-3 rounded-lg px-3 text-xs font-semibold text-muted-strong transition-colors hover:bg-bg hover:text-ink"
          >
            <CircleHelp className="size-4" />
            Aide & support
          </Link>
          <div className="mt-3">
            <PremiumTenantCard name={user?.tenant.name} tier={user?.tenant.tier} />
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 flex h-11 w-full items-center gap-3 rounded-lg px-3 text-xs font-semibold text-muted transition-colors hover:bg-danger-subtle hover:text-danger-subtle-foreground"
          >
            <LogOut className="size-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-border bg-bg">
          <div className="flex h-[68px] items-center justify-between gap-4 px-4 md:px-5">
            <div className="md:hidden">
              <Brand />
            </div>
            <div className="hidden md:block">
              <Brand />
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Link
                href="/profile"
                className="ml-1 grid size-11 place-items-center rounded-full border border-border bg-inverse text-xs font-bold text-inverse-foreground transition-colors hover:bg-primary"
                aria-label="Profil"
              >
                {initials || "MK"}
              </Link>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1320px] px-4 pb-24 pt-5 md:px-5 md:pb-10">
          {children}
        </main>
      </div>

      <nav
        className={`fixed inset-x-0 bottom-0 z-40 grid border-t border-border bg-bg px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 md:hidden ${user?.role === "AGENT" ? "grid-cols-1" : "grid-cols-5"}`}
        aria-label="Navigation mobile"
      >
        {mobileNavItems.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`) ||
            (item.href === "/more" &&
              ["/payments", "/reports", "/help", "/profile"].some((route) =>
                pathname.startsWith(route),
              ));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-semibold transition-colors ${active ? "bg-primary-subtle text-primary" : "text-muted hover:bg-surface hover:text-ink"}`}
            >
              <Icon className="size-5" />
              {item.shortLabel}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
