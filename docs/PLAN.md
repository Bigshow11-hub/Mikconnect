# Plan de développement — mikconnect

> Phasage : Phase 0 (fondations) → Phase 1 (MVP) → Phase 2 (croissance)
> → Phase 3 (scale).
> Stack & architecture : voir `ARCHITECTURE.md`.
> Produit & périmètre : voir `PRD.md`.
> Marché : voir `CONCURRENTS.md`.

## Phase 0 — Fondations (≈ 1 semaine)

### 0.1 Monorepo & tooling

- [ ] `package.json` racine (pnpm workspaces) + `pnpm-workspace.yaml`.
- [ ] `packages/config` : `tsconfig.base.json`, ESLint flat config,
      Prettier, preset Tailwind partagé.
- [ ] CI : lint + typecheck + build + tests sur chaque PR (GitHub Actions).
- [ ] Precommit : husky + lint-staged.

### 0.2 Design system (piloté par Impeccable)

- [ ] **Après redémarrage opencode** : `/impeccable init` dans `mikconnect/`
      → lane **product**, audience petits propriétaires CI/GN.
- [ ] Récupérer `PRODUCT.md` + `DESIGN.md` (typo, palette OKLCH, tokens).
- [ ] `packages/ui` : setup Tailwind + shadcn/ui + tokens depuis DESIGN.md.
- [ ] Composants de base (Button, Input, Card, Badge, Table, Toast, Modal,
      StatCard, TicketCard) selon les directives Impeccable (pas d'Inter,
      gris teintés, pas de cards dans cards).
- [ ] `.gitignore` avec le bloc impeccable.

### 0.3 Base de données & auth

- [ ] Schéma Prisma multi-tenant : `Tenant, User, Role, Zone, Router,
Plan, Ticket, Agent, Sale, Session, Payment, Subscription, AuditLog`.
- [ ] Migration initiale + seed (forfaits par défaut CI/GN, paliers).
- [ ] RLS Postgres : policies par `tenant_id` + tests d'isolation.
- [ ] Auth NestJS : JWT access + refresh rotation, guards RBAC
      (owner / agent / admin), context tenant.

## Phase 1 — MVP (≈ 5-6 semaines)

### 1.1 Onboarding propriétaire

- [x] Inscription, choix pays (CI/GN), devise, forfaits par défaut.
- [x] Page de pairing MikroTik (IP/DDNS + identifiants API, port et API-SSL).
- [x] Test connexion RouterOS API + stockage chiffré des identifiants.
- [x] Lecture des sessions Hotspot actives, état routeur et tolérance aux pannes partielles.
- [x] Vue réseau temps réel des utilisateurs connectés (rafraîchissement 15 s).
- [ ] Validation sur une matrice de routeurs physiques RouterOS 6/7 avant production.

### 1.2 Tickets

- [x] Génération batch (forfait, quantité, codes sécurisés sans tirets, statuts).
- [x] Push des tickets vers le routeur (utilisateurs Hotspot via RouterOS API).
- [x] Feuille PDF A4 téléchargeable (10 vouchers découpables par page).
- [x] Liste / filtres / recherche de tickets.

### 1.3 Agents

- [x] CRUD agents (sous-comptes), commission % configurable.
- [x] Attribution de lots par le propriétaire et espace revendeur distinct.
- [x] Vue agent : stock attribué, confirmation de vente, PDF, ventes + commission.
- [x] Vue propriétaire : ventes par agent, stock disponible et commission due.

### 1.4 Mobile money direct (Cinetpay)

- [x] Intégration Cinetpay (CI : Orange/MTN/Moov/Wave ; GN : Orange/MTN/Sudi). Wrapper isolé + mode mock ; activation production après configuration des clés.
- [x] Page d'achat publique (choix forfait, opérateur, téléphone, paiement, confirmation).
- [x] Webhook idempotent (HMAC `x-token` + vérification CinetPay + id transaction) → vente et livraison du code.
- [x] Envoi SMS du code au client + journal de livraison RLS (`SmsDelivery`).

### 1.5 RADIUS & accounting

- [x] Configuration FreeRADIUS 3.2.8 conteneurisée + module SQL PostgreSQL.
- [x] Auth des codes et accounting start/stop/interim → sessions métier.
- [x] Reconciliation : émis vs vendus vs utilisés + alerte usage non vendu.
- [ ] Validation d’intégration avec Docker et routeurs physiques RouterOS 6/7.

### 1.6 Dashboard propriétaire

- [x] Revenu du jour / mois (devise tenant), tickets actifs, canaux physique/en ligne.
- [x] État routeur (en ligne / hors ligne) et sessions Hotspot en direct.
- [x] Détail des connexions : utilisateur, IP, MAC, durée et trafic montant/descendant.
- [ ] Alerte écart agent (seuil configurable).
- [x] Graphes légers : revenus physiques/portail sur 14 jours et fréquentation sur 7 jours.

### 1.7 Rapport mensuel

- [ ] Génération PDF (revenu, commissions, tickets par forfait, écarts).
- [ ] Export téléchargeable.

### 1.8 Abonnement

- [ ] Paliers (gratuit / Pro / Business), limites par palier.
- [ ] Souscription mobile money (paiement ponctuel puis récurrent en V2).

### 1.9 PWA & i18n

- [ ] `next-pwa` : manifest, service worker, offline lecture dashboard.
- [ ] `next-intl` : FR par défaut, structure EN / PT.

### 1.10 Tests & qualité

- [x] Unitaires API : 76 tests Vitest sur auth, tenants, tickets, agents,
      paiements, MikroTik et accounting RADIUS.
- [ ] Unitaires composants UI.
- [ ] Intégration : Prisma + API + FreeRADIUS (conteneur) en CI.
- [x] Socle E2E Playwright : PostgreSQL 16 isolé, seed déterministe à deux
      tenants, Chromium desktop + Android, traces/captures/vidéos en échec,
      zéro retry et services externes simulés.
- [x] E2E critiques : authentification owner/agent, RBAC, isolation tenant,
      génération de lot, vente agent, achat mobile money et dashboard.
- [ ] E2E restants : onboarding complet, rapport mensuel et abonnement lorsque
      les phases 1.7/1.8 seront implémentées.
- [x] Contrats visuels Playwright préparés sur connexion, dashboard, tickets,
      agent et portail, clair/sombre et desktop/mobile.
- [ ] Générer et valider les premières baselines visuelles sur la CI stable,
      puis rendre leur comparaison bloquante.
- [x] Première passe sécurité E2E : routes privées, RBAC agent/owner et lecture
      cross-tenant ; filtres `tenantId` explicites sur les ressources sensibles.
- [ ] Review complète des secrets et dependency audit.

### 1.11 Déploiement MVP

- [ ] Frontend sur Vercel (ou VPS).
- [ ] Backend/DB/RADIUS/Redis sur VPS Docker Compose + Cloudflare.
- [ ] Sentry, logs pino, runbook.
- [ ] Backup DB quotidien + PITR.

## Phase 2 — Croissance (≈ 4-5 semaines)

- [ ] Multi-zones (illimité par palier) + switcher de zone.
- [ ] Alertes coupure routeur + quotas bande passante (push config Mikrotik).
- [ ] Notifications push (PWA) + SMS (fin forfait, écart agent).
- [ ] Facturation récurrente abonnement (mobile money).
- [ ] Panneau admin mikconnect (tenants, paliers, support, métriques).
- [ ] Export compta CSV + rapports personnalisés (plage de dates).
- [ ] Historique sessions clients (durée, data consommée).
- [ ] Performance : cache Redis, indexes, pagination.

## Phase 3 — Scale (continu)

- [ ] Abstraction vendor (interface `VendorAdapter` + Ubiquiti/OpenWrt).
- [ ] White-label / distributeurs (sous-plateformes marquées).
- [ ] USSD agents (feature-phone) via passerelle opérateur.
- [ ] API publique + webhooks + documentation.
- [ ] Analytics avancés (prévision revenu, churn).
- [ ] Extension pays (Sénégal, Mali, Burkina, Cameroun, RDC) + devises.

## Design — pilotage Impeccable (pendant les phases 1-2)

Pendant le dev de chaque écran, enchaîner les commandes Impeccable :

1. `/impeccable shape <écran>` — plan UX/UI avant de coder.
2. Implémentation.
3. `/impeccable critique <écran>` — revue hiérarchie / clarté.
4. `/impeccable audit <écran>` — a11y / perf / responsive.
5. `/impeccable polish <écran>` — alignement design system + shipping.
6. `/impeccable harden <écran>` — i18n / edge cases / erreurs.

Écrans prioritaires à "shaper" :

- Onboarding + pairing routeur.
- Dashboard propriétaire (revenu, tickets, écarts).
- Génération / impression de tickets.
- Espace agent (vente, commission).
- Page d'achat mobile money (publique).
- Rapport mensuel.
- Souscription abonnement.

## Risques projet & mitigations

| Risque                         | Mitigation                                                   |
| ------------------------------ | ------------------------------------------------------------ |
| Versions RouterOS hétérogènes  | Matrice de compat testée + fallback commandes                |
| FreeRADIUS ops sur dev Windows | Dev en conteneur Docker ; prod Linux                         |
| Cinetpay changements API       | Wrapper isolé + mocks + tests de contrat                     |
| Sécurité multi-tenant          | RLS + tests d'isolation automatisés + audit                  |
| Scope creep V2/V3              | MVP figé, backlog strict par phase                           |
| AI slop dans le design         | Skill Impeccable + détecteur 46 règles sur chaque fichier UI |

## Tests & qualité

- **Unit** : services NestJS, composants UI.
- **Intégration** : Prisma + API + FreeRADIUS (conteneur) en CI.
- **E2E** : Playwright sur US1–US7.
- **Sécurité** : review secrets, tests RLS, dependency audit (Snyk /
  Dependabot).
- **Charge** : génération 10 000 tickets, 100 tenants (k6) avant prod.

## Déploiement

- **Frontend** : Vercel (preview per PR) ou VPS via reverse proxy.
- **Backend/DB/RADIUS/Redis** : VPS Linux Docker Compose + Cloudflare.
- **Environnements** : dev / staging / prod + migrations Prisma automatisées.
- **Backup** : DB quotidienne + PITR, secrets en vault.
