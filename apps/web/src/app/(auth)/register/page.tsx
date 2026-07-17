"use client";

import { useState } from "react";
import Link from "next/link";

import { Button, Input, Label, toast } from "@mikconnect/ui";
import { register } from "@/features/auth/use-auth";
import { ApiError } from "@/lib/api";
import type { Country } from "@/features/auth/types";

/**
 * /register — mikconnect.
 *
 * Inscription propriétaire : crée le tenant + owner + forfaits par défaut
 * (POST /auth/register). Colonne unique max-w-sm, mobile-first.
 * Après succès, le guard (auth) redirige vers /dashboard, qui redirige vers
 * /onboarding si aucun routeur n'est appairé (item 6).
 *
 * Pays : CI ou GN (radio, 2 options — plus mobile-friendly qu'un select).
 * La devise est déduite du pays côté API (XOF / GNF).
 */
export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    tenantName: "",
    country: "CI" as Country,
    phone: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        country: form.country,
        tenantName: form.tenantName.trim(),
        phone: form.phone.trim() || undefined,
      });
      toast.success("Compte créé", {
        description: "Bienvenue. Configurons votre première zone.",
      });
      // Le guard (auth) redirige vers /dashboard → /onboarding (item 6).
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Inscription impossible. Réessayez.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Créer votre compte</h1>
        <p className="text-sm text-muted">
          Pilotez vos zones WiFi, vendez plus, gardez le contrôle. Essai gratuit, sans carte bancaire.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Votre nom</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Awa Koné"
            required
            maxLength={80}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            invalid={!!error}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tenantName">Nom de votre activité</Label>
          <Input
            id="tenantName"
            placeholder="WiFi Plateau"
            required
            maxLength={80}
            value={form.tenantName}
            onChange={(e) => set("tenantName", e.target.value)}
            invalid={!!error}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            invalid={!!error}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="8 caractères minimum"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            invalid={!!error}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Téléphone (optionnel)</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+225 07 00 00 00 00"
            maxLength={80}
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium text-ink leading-none">Pays</legend>
          <div className="flex gap-2">
            {(
              [
                { value: "CI", label: "Côte d'Ivoire" },
                { value: "GN", label: "Guinée" },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors duration-200 ease-quint ${
                  form.country === opt.value
                    ? "border-primary bg-primary-subtle text-primary-subtle-foreground"
                    : "border-border bg-bg text-muted hover:bg-surface-2 hover:text-ink"
                }`}
              >
                <input
                  type="radio"
                  name="country"
                  value={opt.value}
                  checked={form.country === opt.value}
                  onChange={() => set("country", opt.value)}
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={loading}>
        {loading ? "Création…" : "Créer mon compte"}
      </Button>

      <p className="text-sm text-muted">
        Déjà un compte ?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
