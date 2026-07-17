"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import {
  Badge,
  Building2,
  Button,
  Input,
  Label,
  Palette,
  ShieldCheck,
  UserRound,
  toast,
} from "@mikconnect/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { authApi } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/store";
import { useAuth } from "@/features/auth/use-auth";

export default function ProfilePage() {
  const { user } = useAuth();
  const setUser = useAuthStore((state) => state.setUser);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tenantName, setTenantName] = useState("");

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setPhone(user.phone ?? "");
    setTenantName(user.tenant.name);
  }, [user]);

  const mutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (updated) => {
      setUser(updated);
      toast.success("Profil mis à jour", {
        description: "Vos informations sont maintenant à jour partout dans mikconnect.",
      });
    },
    onError: (error: Error) => {
      toast.error("Mise à jour impossible", { description: error.message });
    },
  });

  const initials = user?.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    mutation.mutate({
      name: name.trim(),
      phone: phone.trim(),
      ...(user?.role === "OWNER" || user?.role === "ADMIN" ? { tenantName: tenantName.trim() } : {}),
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col justify-between gap-5 border-b border-border pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted">Compte et préférences</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-ink sm:text-3xl">
            Votre profil
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Gardez vos coordonnées, votre espace de travail et votre affichage à jour.
          </p>
        </div>
        <Badge tone="success"><ShieldCheck /> Session sécurisée</Badge>
      </div>

      <div className="flex items-center gap-4 border-b border-border py-7">
        <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-inverse font-mono text-base font-semibold text-inverse-foreground">
          {initials || "MK"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-ink">{user?.name}</p>
          <p className="truncate text-sm text-muted">{user?.email}</p>
        </div>
        <span className="ml-auto hidden rounded-full bg-primary-subtle px-3 py-1 text-xs font-semibold text-primary-subtle-foreground sm:inline-flex">
          {user?.role === "OWNER" ? "Propriétaire" : user?.role}
        </span>
      </div>

      <form onSubmit={submit} className="divide-y divide-border">
        <SettingsSection
          icon={<UserRound />}
          title="Informations personnelles"
          description="Utilisées pour vous identifier dans l’équipe et les rapports."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nom complet" htmlFor="profile-name">
              <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required />
            </Field>
            <Field label="Téléphone" htmlFor="profile-phone">
              <Input id="profile-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+224 6XX XX XX XX" maxLength={30} />
            </Field>
            <Field label="Adresse email" htmlFor="profile-email" hint="L’adresse de connexion ne se modifie pas ici.">
              <Input id="profile-email" value={user?.email ?? ""} disabled />
            </Field>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={<Building2 />}
          title="Espace de travail"
          description="Le nom visible par les propriétaires et les agents."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nom de l’espace" htmlFor="tenant-name">
              <Input id="tenant-name" value={tenantName} onChange={(event) => setTenantName(event.target.value)} minLength={2} maxLength={80} required disabled={user?.role === "AGENT"} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyMetric label="Pays" value={user?.tenant.country === "GN" ? "Guinée" : "Côte d’Ivoire"} />
              <ReadOnlyMetric label="Devise" value={user?.tenant.currency ?? "—"} />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={<Palette />}
          title="Apparence"
          description="Choisissez le contraste adapté à votre environnement de travail."
        >
          <div className="flex items-center justify-between gap-5 rounded-lg bg-surface-2 px-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-ink">Thème de l’interface</p>
              <p className="mt-0.5 text-xs text-muted">Clair au soleil, sombre pour la gestion nocturne.</p>
            </div>
            <ThemeToggle />
          </div>
        </SettingsSection>

        <div className="flex justify-end py-6">
          <Button type="submit" disabled={mutation.isPending || !name.trim() || !tenantName.trim()}>
            {mutation.isPending ? "Enregistrement…" : "Enregistrer les modifications"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-5 py-7 md:grid-cols-[240px_minmax(0,1fr)] md:gap-10">
      <div className="flex gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted-strong [&>svg]:size-[18px]">{icon}</span>
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-2">{children}</div>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function ReadOnlyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg px-3.5 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
