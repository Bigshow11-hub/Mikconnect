"use client";

import { useState } from "react";
import Link from "next/link";

import { Button, Input, Label, toast } from "@mikconnect/ui";
import { login } from "@/features/auth/use-auth";
import { ApiError } from "@/lib/api";

/**
 * /login — mikconnect.
 *
 * Formulaire calme, colonne unique max-w-sm (shell (auth)).
 * Mobile-first : CTA collé au pouce, touch targets 40px (Input h-10).
 * Le guard (auth) redirige vers /dashboard si session déjà active.
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      toast.success("Connexion réussie", { description: "Bienvenue sur mikconnect." });
      // Le guard (auth) redirige vers /dashboard quand status → authenticated.
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Connexion impossible. Réessayez.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Connexion</h1>
        <p className="text-sm text-muted">Reprenez le pilotage de vos zones WiFi.</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={!!error}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={!!error}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={loading}>
        {loading ? "Connexion…" : "Se connecter"}
      </Button>

      <p className="text-sm text-muted">
        Pas encore de compte ?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
