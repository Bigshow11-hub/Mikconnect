# Architecture — mikconnect

> Stack validée : **Next.js + NestJS + PostgreSQL**.
> Cible : MVP multi-tenant, CI & Guinée, mobile money Cinetpay, Mikrotik
> via API RouterOS + FreeRADIUS.

## 1. Vue d'ensemble

```
[Next.js PWA (Vercel / VPS)] ──HTTPS──▶ [NestJS API]
                                          │
   ┌──────────────┬───────────────┬──────┴────────┬───────────────┐
   ▼              ▼               ▼               ▼               ▼
PostgreSQL    FreeRADIUS       Redis/BullMQ   Mikrotik        Payments/SMS
(multi-tenant, (auth+accounting, jobs: tickets,  Connector      (Cinetpay +
 RLS)          sessions depuis   SMS, recon,    (node-routeros)  SMS gateway)
                PG)              reports)           │
                                                     ▼
                                              Routeurs Mikrotik
                                              (hotspot + API)
```

## 2. Composants

### 2.1 Frontend — `apps/web`

- **Next.js** (App Router) + **TypeScript**.
- **Tailwind CSS** + **shadcn/ui** (Radix) — design piloté par le skill
  Impeccable (typo non-Inter, palette teintée OKLCH, pas de cards dans
  cards, pas de bounce/elastic).
- **PWA** : `next-pwa`, manifest, service worker, offline lecture du
  dashboard.
- State : **Zustand** + **React Query** (TanStack Query) pour le cache
  serveur.
- Graphes : **recharts** (revenu journalier/mensuel, répartition forfaits).
- i18n : `next-intl` (FR par défaut, EN / PT prêts).
- Devise : `Intl.NumberFormat` (XOF, GNF).

### 2.2 Backend — `apps/api`

- **NestJS** + **TypeScript**, modulaire (Users, Auth, Tenants, Zones,
  Routers, Tickets, Agents, Sales, Payments, Reports, Subscriptions).
- **Prisma** ORM + validation `class-validator` / DTOs.
- RBAC : rôles `owner` / `agent` / `admin`, guards NestJS.
- Auth : **JWT** (access court) + **refresh token** avec rotation.
- OpenAPI auto-générée (`@nestjs/swagger`).
- Logs structurés : **pino**.

### 2.3 Base de données — PostgreSQL

- Multi-tenant via `tenant_id` sur chaque table + **Row-Level Security**
  (policies Postgres filtrant par `tenant_id`).
- Prisma schema + migrations versionnées.
- Index sur `(tenant_id, created_at)` pour les requêtes dashboard.
- Schémas : `Tenant, User, Role, Zone, Router, Plan, Ticket, Agent, Sale,
Session, Payment, Subscription, AuditLog`.

### 2.4 RADIUS — FreeRADIUS

- **FreeRADIUS** avec module SQL → tables users / groupes / accounting dans
  PostgreSQL (schéma dédié, partagé avec l'API pour la reconciliation).
- Authentification des codes pushés (tickets) : start / stop / interim
  accounting → sessions utilisées pour le billing et la reconciliation.
- Permet l'**offline** : le routeur interroge RADIUS ; les tickets
  pré-pushés restent valides même si le cloud tombe.
- Hébergé en conteneur Docker (Linux) à côté de l'API.

### 2.5 Mikrotik Connector (service dans `apps/api`)

- Utilise **node-routeros** pour parler l'API RouterOS.
- Opérations :
  - Test de connexion au pairing.
  - Sync hotspot (SSID, profils, queues).
  - Push batch de tickets (création des users hotspot).
  - Monitoring : interfaces, sessions actives, uptime.
- Credentials chiffrés au repos (AES), déchiffrés à la volée en mémoire.
- Gestion IP dynamique via DDNS fourni par le propriétaire.

### 2.6 Payments — Cinetpay

- **Cinetpay** : agrégateur couvrant CI (Orange, MTN, Moov, Wave) et GN
  (Orange, MTN, Sudi). Une intégration, plusieurs opérateurs.
- Flux : page d'achat → redirection Cinetpay → **webhook** idempotent
  (vérification signature + id de transaction) → génération du code →
  SMS au client.
- Statut transactionnel : `pending / success / failed / cancelled`,
  reconcilié avec les tickets émis.

### 2.7 SMS

- Passerelle principale locale (à sélectionner selon pays) + fallback
  (ex: Twilio) pour la livraison des codes.
- Retry + journal de livraison (statut, attempts, provider).

### 2.8 Jobs — Redis + BullMQ

- Génération batch de tickets (jusqu'à 1 000+).
- Envoi SMS (avec retry + fallback).
- Reconciliation périodique (émis vs vendus vs utilisés).
- Génération des rapports mensuels PDF.
- Alertes (écart agent, coupure routeur, fin de forfait).

### 2.9 Observabilité

- **Sentry** (erreurs front + back).
- Logs structurés **pino** → stdout (collecte VPS).
- Métriques basiques : uptime, latence API, jobs en file, taux de succès
  paiement.

## 3. Multi-tenant & sécurité

- **Isolation** : `tenant_id` sur toutes les tables métier + RLS Postgres.
  L'API injecte le `tenant_id` depuis le JWT dans le contexte Prisma.
- **Tests d'isolation** : tests automatisés vérifiant qu'un tenant ne peut
  lire/écrire les données d'un autre.
- **Credentials Mikrotik** : chiffrés AES-256 au repos, clé en variable
  d'environnement (vault en prod).
- **RBAC** : `owner` (tout son tenant), `agent` (vente + lecture de ses
  ventes), `admin` (tous tenants, panneau admin).
- **Audit** : table `AuditLog` (qui a fait quoi, quand, sur quelle ressource).

## 4. Flux clés

### 4.1 Pairing routeur

1. Propriétaire saisit IP/DDNS + identifiants API.
2. API teste la connexion via `node-routeros`.
3. Credentials chiffrés → stockés.
4. Sync hotspot (lecture des profils/SSID).
5. État du routeur = en ligne.

### 4.2 Génération + vente de tickets (canal agent)

1. Propriétaire ou agent lance un batch (forfait, quantité).
2. Job BullMQ génère les codes + les push au routeur (RADIUS users).
3. Statut = émis.
4. Agent vend en cash → statut = vendu (commission calculée).
5. Client utilise le code → RADIUS accounting → statut = utilisé.

### 4.3 Achat direct mobile money

1. Client ouvre la page d'achat, choisit un forfait.
2. Redirection Cinetpay → paiement Orange/MTN/Wave/Moov.
3. Webhook idempotent → confirmation.
4. Génération du code + push RADIUS + SMS au client.
5. Statut = vendu + utilisé à la connexion.

### 4.4 Reconciliation

1. Job périodique compare : tickets émis ↔ vendus (agents) ↔ utilisés
   (RADIUS accounting).
2. Écart > seuil → alerte propriétaire (dashboard + notification).
3. Rapport mensuel agrège revenu, commissions, écarts.

## 5. Hébergement & déploiement

- **Frontend** : Vercel (preview par PR) OU même VPS via reverse proxy
  (Nginx / Caddy).
- **Backend / DB / RADIUS / Redis** : VPS Linux (Hetzner FR, faible latence
  vers l'Afrique de l'Ouest) en **Docker Compose**, Cloudflare devant (CDN
  - TLS + cache assets).
- **Environnements** : `dev` / `staging` / `prod` + migrations Prisma
  automatisées en CI.
- **Backups** : DB quotidienne + PITR (point-in-time recovery), secrets en
  vault.
- **CI/CD** : lint + typecheck + tests + build sur chaque PR, déploiement
  auto sur staging, manuel pour prod.

## 6. Structure du monorepo

```
mikconnect/
  apps/
    web/            # Next.js PWA (front)
    api/            # NestJS API (back)
      prisma/       # schéma + migrations
      src/
  packages/
    ui/             # composants partagés (shadcn + design Impeccable)
    config/         # configs partagées (tsconfig, eslint, tailwind preset)
  docs/             # PRD, ARCHITECTURE, PLAN, CONCURRENTS
  .gitignore
  package.json      # workspace racine (pnpm)
  pnpm-workspace.yaml
```

## 7. Choix techniques & justifications

| Choix                | Raison                                                  |
| -------------------- | ------------------------------------------------------- |
| Next.js (App Router) | PWA + SSR + écosystème mature, deploy facile            |
| NestJS               | Architecture modulaire typée, idéal multi-tenant + RBAC |
| PostgreSQL + RLS     | Isolation multi-tenant native, fiable, gratuit          |
| Prisma               | Migrations versionnées, DX excellente, typage           |
| FreeRADIUS           | Standard auth WiFi, accounting, offline-compatible      |
| node-routeros        | Pilote stable pour l'API Mikrotik                       |
| Cinetpay             | Un agrégateur pour CI + GN, multi-opérateurs            |
| BullMQ + Redis       | Jobs robustes (batch, retry, reconciliation)            |
| Tailwind + shadcn/ui | Compatible skill Impeccable, composants accessibles     |
| pnpm workspaces      | Monorepo rapide, hoisting strict                        |

## 8. Évolutions prévues (V2/V3)

- Abstraction vendor : interface `VendorAdapter` + connectors Ubiquiti /
  OpenWrt (V3) → RADIUS reste le pivot.
- White-label : sous-tenants "distributeur" avec branding propre.
- USSD : passerelle opérateur pour agents feature-phone.
- API publique + webhooks pour intégrations tierces.
