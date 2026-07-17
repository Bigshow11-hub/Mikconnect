"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge, Button, Input, Label, toast } from "@mikconnect/ui";
import { ApiError } from "@/lib/api";
import { routersApi, zonesApi } from "@/features/onboarding/api";
import type { RouterTestResult, Zone } from "@/features/onboarding/types";

/**
 * /onboarding — mikconnect.
 *
 * Wizard 3 étapes post-auth :
 *  1. Nommer la première zone       → POST /zones
 *  2. Connecter le routeur Mikrotik → POST /routers/test puis POST /routers
 *  3. Récap → /dashboard
 *
 * Design : colonne unique max-w-sm, header d'étape discret (1/3…), CTA au
 * pouce. Le pairing doit réussir pour finir (routeur requis — décision
 * confirmée dans le shape brief). Mode mock en dev : le test simule un
 * routeur reachable.
 */
type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Étape 1 — zone
  const [zoneName, setZoneName] = useState("");
  const [zoneLocation, setZoneLocation] = useState("");
  const [zone, setZone] = useState<Zone | null>(null);
  const [step1Loading, setStep1Loading] = useState(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Étape 2 — routeur
  const [routerForm, setRouterForm] = useState({
    label: "",
    host: "",
    apiUser: "",
    apiPassword: "",
    apiPort: "8728",
    apiTls: false,
  });
  const [testResult, setTestResult] = useState<RouterTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  function setRouterField<K extends keyof typeof routerForm>(
    key: K,
    value: (typeof routerForm)[K],
  ) {
    setRouterForm((f) => ({ ...f, [key]: value }));
    setTestResult(null);
    setStep2Error(null);
  }

  async function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    setStep1Error(null);
    setStep1Loading(true);
    try {
      const created = await zonesApi.create({
        name: zoneName.trim(),
        location: zoneLocation.trim() || undefined,
      });
      setZone(created);
      setStep(2);
    } catch (err) {
      setStep1Error(err instanceof ApiError ? err.message : "Création de la zone impossible.");
    } finally {
      setStep1Loading(false);
    }
  }

  async function handleTest() {
    setStep2Error(null);
    setTesting(true);
    setTestResult(null);
    try {
      const result = await routersApi.test({
        host: routerForm.host.trim(),
        apiUser: routerForm.apiUser.trim(),
        apiPassword: routerForm.apiPassword,
        apiPort: Number(routerForm.apiPort),
        apiTls: routerForm.apiTls,
      });
      setTestResult(result);
    } catch (err) {
      setStep2Error(err instanceof ApiError ? err.message : "Test impossible.");
    } finally {
      setTesting(false);
    }
  }

  async function handleStep2Submit(e: React.FormEvent) {
    e.preventDefault();
    if (!zone) return;
    setStep2Error(null);
    setSaving(true);
    try {
      await routersApi.create({
        zoneId: zone.id,
        label: routerForm.label.trim(),
        host: routerForm.host.trim(),
        apiUser: routerForm.apiUser.trim(),
        apiPassword: routerForm.apiPassword,
        apiPort: Number(routerForm.apiPort),
        apiTls: routerForm.apiTls,
      });
      toast.success("Routeur connecté", {
        description: "Votre zone est exploitable.",
      });
      setStep(3);
    } catch (err) {
      setStep2Error(err instanceof ApiError ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <StepHeader step={step} />

      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Nommez votre première zone</h1>
            <p className="text-sm text-muted">
              Un quartier, un café, un immeuble — le nom que vos clients connaissent.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="zoneName">Nom de la zone</Label>
              <Input
                id="zoneName"
                placeholder="Plateau"
                required
                maxLength={80}
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                invalid={!!step1Error}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="zoneLocation">Emplacement (optionnel)</Label>
              <Input
                id="zoneLocation"
                placeholder="près de la pharmacie"
                maxLength={120}
                value={zoneLocation}
                onChange={(e) => setZoneLocation(e.target.value)}
              />
            </div>
          </div>

          {step1Error && (
            <p className="text-sm text-danger" role="alert">
              {step1Error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={step1Loading || !zoneName.trim()}>
            {step1Loading ? "Création…" : "Continuer"}
          </Button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleStep2Submit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Connectez votre routeur Mikrotik</h1>
            <p className="text-sm text-muted">
              Trouvez ces informations dans Winbox → IP Services → API. On les chiffre, elles ne quittent pas votre compte.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="routerLabel">Nom du routeur</Label>
              <Input
                id="routerLabel"
                placeholder="Routeur plateau"
                required
                maxLength={80}
                value={routerForm.label}
                onChange={(e) => setRouterField("label", e.target.value)}
                invalid={!!step2Error}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="routerHost">Adresse IP ou DDNS</Label>
              <Input
                id="routerHost"
                placeholder="192.168.88.1"
                required
                maxLength={253}
                value={routerForm.host}
                onChange={(e) => setRouterField("host", e.target.value)}
                invalid={!!step2Error}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="apiUser">Utilisateur API</Label>
              <Input
                id="apiUser"
                placeholder="api"
                required
                maxLength={64}
                value={routerForm.apiUser}
                onChange={(e) => setRouterField("apiUser", e.target.value)}
                invalid={!!step2Error}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="apiPassword">Mot de passe API</Label>
              <Input
                id="apiPassword"
                type="password"
                required
                maxLength={72}
                value={routerForm.apiPassword}
                onChange={(e) => setRouterField("apiPassword", e.target.value)}
                invalid={!!step2Error}
              />
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-3">
              <label htmlFor="apiTls" className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border bg-bg px-3 text-sm text-ink">
                <input
                  id="apiTls"
                  type="checkbox"
                  className="size-5 accent-primary"
                  checked={routerForm.apiTls}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setRouterForm((form) => ({
                      ...form,
                      apiTls: checked,
                      apiPort:
                        form.apiPort === "8728" || form.apiPort === "8729"
                          ? checked
                            ? "8729"
                            : "8728"
                          : form.apiPort,
                    }));
                    setTestResult(null);
                  }}
                />
                API sécurisée
              </label>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="apiPort">Port</Label>
                <Input
                  id="apiPort"
                  type="number"
                  min={1}
                  max={65535}
                  required
                  value={routerForm.apiPort}
                  onChange={(event) => setRouterField("apiPort", event.target.value)}
                  invalid={!!step2Error}
                />
              </div>
            </div>
            <p className="text-xs leading-5 text-muted">
              TLS utilise normalement le port 8729. Sans TLS, gardez l’API sur un réseau privé ou dans un tunnel chiffré.
            </p>
          </div>

          {testResult && (
            <div className="flex items-center gap-2" role="status">
              <Badge tone={testResult.ok ? "success" : "danger"} dot>
                {testResult.ok ? "Connecté" : "Échec"}
              </Badge>
              <span className="text-sm text-ink">{testResult.message}</span>
            </div>
          )}
          {testResult?.ok && testResult.detail && (
            <p className="font-mono text-sm text-muted">{testResult.detail}</p>
          )}

          {step2Error && (
            <p className="text-sm text-danger" role="alert">
              {step2Error}
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={testing || !routerForm.host.trim() || !routerForm.apiUser.trim() || !routerForm.apiPassword}
            onClick={handleTest}
          >
            {testing ? "Test en cours…" : "Tester la connexion"}
          </Button>

          <Button
            type="submit"
            size="lg"
            disabled={saving || !testResult?.ok || !routerForm.label.trim()}
          >
            {saving ? "Connexion…" : "Connecter et terminer"}
          </Button>

          <button
            type="button"
            className="text-sm text-muted hover:text-ink hover:underline"
            onClick={() => setStep(1)}
          >
            Retour
          </button>
        </form>
      )}

      {step === 3 && zone && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Votre zone est exploitable</h1>
            <p className="text-sm text-muted">
              Tout est prêt. Vous pouvez générer des tickets et suivre votre revenu.
            </p>
          </div>

          <dl className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-col gap-0.5">
              <dt className="text-sm text-muted">Zone</dt>
              <dd className="text-sm font-medium text-ink">{zone.name}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-sm text-muted">Routeur</dt>
              <dd className="text-sm font-medium text-ink">{routerForm.label}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-sm text-muted">Hôte</dt>
              <dd className="font-mono text-sm text-ink">{routerForm.host}</dd>
            </div>
          </dl>

          <Button size="lg" onClick={() => router.push("/dashboard")}>
            Aller au tableau de bord
          </Button>
        </div>
      )}
    </div>
  );
}

function StepHeader({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-1 text-sm text-muted" aria-live="polite">
      <span className="font-medium text-ink">Étape {step} sur 3</span>
    </div>
  );
}
