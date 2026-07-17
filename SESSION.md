# SESSION STATE — mikconnect

> Reprendre ici au démarrage d'une nouvelle session. Dernière MAJ : 2026-07-17

## État détaillé — Validation matérielle RouterOS préparée (2026-07-17)

- Ajout d'un diagnostic RouterOS strictement en lecture seule :
  `scripts/mikrotik/diagnostic-readonly.rsc`.
- Ajout de `pnpm --filter @mikconnect/api mikrotik:smoke`, qui force le mode
  réel et réutilise exactement `MikrotikConnectorService` pour lire l'identité,
  la version et `/ip/hotspot/active`.
- Les identifiants du smoke test passent uniquement par l'environnement et ne
  sont jamais journalisés ; API-SSL 8729 est le transport par défaut.
- Cinq tests couvrent le chemin `node-routeros` réel simulé au niveau transport :
  TLS, identité, sessions Hotspot, création de ticket, déconnexion et blocage.
- Vérifications locales : 84/84 tests API, typecheck et build verts.
- Reste à faire sur le matériel : exécuter le diagnostic, lancer le smoke test
  avec le compte du routeur, puis seulement après succès effectuer un essai
  contrôlé d'écriture et le nettoyer.

## État détaillé — Phase 1.10 E2E & fiabilisation (2026-07-17)

- Nouveau workspace `apps/e2e` avec Playwright, Chromium desktop et Pixel 5,
  zéro retry, erreurs console bloquantes et traces/captures/vidéos conservées.
- Base PostgreSQL E2E protégée par garde-fou : le nom de base ou de schéma doit
  contenir `e2e` avant tout reset. Seed déterministe avec deux tenants et owners.
- Le setup passe par les vraies routes HTTP pour créer routeurs mock, agent et
  stocks de tickets. CinetPay, SMS et MikroTik utilisent leurs adapters mock.
- Parcours écrits : auth owner/agent/anonyme, lot compact 4 caractères, vente
  agent, achat mobile money, RBAC, isolation cross-tenant et baseline performance.
- Contrats visuels prêts pour login, dashboard, tickets, agent et portail en
  clair/sombre et mobile/desktop. Les PNG de référence restent à générer sur la
  première CI PostgreSQL locale stable avant de rendre ce job bloquant.
- CI GitHub : service PostgreSQL 16, installation Chromium, E2E après le job
  qualité, rapport HTML systématique et artefacts d'échec pendant 14 jours.
- Défauts découverts et corrigés : métadonnées DTO Agents perdues par `import
type`, lecture d'un ticket cross-tenant par ID, listes/détails zones-routeurs-
  plans-agents sans filtre explicite, route `/help` absente.
- Dashboard : dix transactions RLS parallèles regroupées dans une transaction ;
  délais interactifs Prisma portés à 20 s d'attente / 30 s d'exécution.
- Vérifications : 76/76 tests API, typecheck complet, lint sans erreur, builds
  API/web verts, route `/help` et détecteur Impeccable sans signalement.
- Exécution E2E locale distante : 9 scénarios ont passé avant indisponibilité du
  pool Supabase. L'isolation cross-tenant corrigée a été confirmée. La source de
  vérité E2E reste la CI PostgreSQL locale afin d'éviter cette dépendance réseau.

## Objectif

Construire **mikconnect**, SaaS multi-tenant de gestion de zones WiFi pour propriétaires Mikrotik en CI & Guinée.
Stack validée : Next.js (web) + NestJS (api) + Postgres, monorepo pnpm.

## Persona & Marque

- User persona : propriétaire de zone WiFi (1-5 zones, Android entrée de gamme, 3G, peu technique).
- Personnalité marque (PRODUCT.md) : **Fiable, Proche, Malin, Calme**.
- Positionnement : "Pilotez vos zones WiFi, vendez plus, gardez le contrôle."
- DESIGN.md seed : North Star _"The Quarter Ledger"_. Restrained (terracotta ≤10%, bg blanc pur).
  - Primary seed OKLCH `oklch(0.544 0.169 31.3)` (terracotta), Accent `oklch(0.42 0.08 230)` (teal).
  - Anti-refs : AI slop SaaS, fintech glacée/néon, enterprise dense.

## Phases validées

- Phase 0.1 (tooling) ✓ — ESLint flat, Prettier, husky+lint-staged, CI GitHub Actions.
- Phase 0.2 (design) ✓ — PRODUCT.md, DESIGN.md, packages/ui (tokens, theme, 9+ composants).
- Phase 0.3 (auth+DB) ✓ — Prisma schéma, PrismaService+RLS, CryptoService, AuthService (JWT rotation), JwtStrategy, guards, AuthController/Module, migration 0001_init, seed, tests vitest.
- Lancement site ✓ — `next dev` répond HTTP 200 sur http://localhost:3000.
- Phase 1.1 (Onboarding + pairing routeur) ✓ — TERMINÉE.
- Phase 1.2 (Tickets) ✓ — TERMINÉE.
- Phase 1.3 (Agents) ✓ — **TERMINÉE cette session**.
- Refonte produit SaaS ✓ — shell desktop/mobile, dashboard business, auth et paiement public.
- Phase 1.4 (Mobile money - CinetPay) ✓ — **SOCLE COMPLET, activation production à configurer**.
- Phase 1.1b (RouterOS API + sessions Hotspot) ✓ — **INTÉGRATION COMPLÈTE, validation physique à faire**.
- Phase 1.5 (FreeRADIUS + accounting) ✓ — **SOCLE LOGICIEL COMPLET, validation Docker/routeur physique à faire**.

## État détaillé — Phase 1.5 RADIUS & accounting (2026-07-17)

- FreeRADIUS 3.2.8 conteneurisé dans `infra/freeradius/`, avec SQL PostgreSQL,
  client MikroTik restreint par sous-réseau et secrets fournis par environnement.
- Chaque nouveau ticket physique ou mobile money crée une identité RADIUS avec
  durée et quota data ; les vues SQL `radcheck` / `radreply` alimentent FreeRADIUS.
- La table standard `radacct` reçoit Start / Interim / Stop. Un worker NestJS
  idempotent synchronise IP, MAC, durée, trafic et fin de session dans `Session`.
- Le premier accounting marque le ticket utilisé, sans effacer la distinction
  entre ticket vendu et usage non vendu.
- Endpoint propriétaire `GET /radius/reconciliation` et panneau dashboard :
  générés, vendus, utilisés, sessions actives et alerte d’écart agent.
- Script routeur `scripts/mikrotik/setup-radius.rsc` avec interim update 5 minutes.
- Migration `0004_radius_accounting` appliquée. Typecheck API/web vert ; tests
  existants 73/73 et 3 tests accounting supplémentaires verts.
- Limite locale : Docker n’est pas installé sur ce poste, donc le conteneur et
  le flux UDP réel restent à valider sur staging ou une machine Docker.

## État détaillé — RouterOS API + utilisateurs en ligne (2026-07-15)

- Transport RouterOS natif configurable : API `8728` ou API-SSL `8729`, délai borné et vérification TLS pilotée par environnement.
- Pairing enrichi avec port et option API sécurisée ; les secrets restent chiffrés en base et ne sont déchiffrés qu'au moment de la connexion.
- Endpoints authentifiés `GET /routers/online-users` et `GET /routers/:id/online-users`.
- Lecture ciblée de `/ip/hotspot/active/print` avec `.proplist` pour limiter le trafic ; normalisation des durées, IP/MAC et compteurs réseau.
- Agrégation multi-routeurs avec isolation des pannes : un routeur indisponible n'empêche pas l'affichage des autres.
- Espace `/zones` renommé « Réseau WiFi » : total connecté, santé des routeurs, dernière vérification, sessions détaillées, états vides/erreur, responsive et mode sombre.
- Scripts RouterOS 7 fournis dans `scripts/mikrotik/` pour API privée et API-SSL, avec groupe utilisateur à privilèges limités.
- Guide d'exploitation et de sécurisation : `docs/MIKROTIK_API.md`.
- Migration `0002_router_api_transport` appliquée ; tests API 65/65, typecheck et lint validés ; scénario navigateur mock validé avec 2 sessions actives et actualisation manuelle.
- Avant production : exécuter le script adapté sur chaque routeur, restreindre le service à l'IP/VPN du serveur, passer `MIKROTIK_MOCK=false`, puis valider sur les modèles RouterOS 6/7 réellement déployés.

## État détaillé — Refonte SaaS + Phase 1.4 (2026-07-15)

### Refonte produit sans « AI slop »

- Shell applicatif entièrement refondu : sidebar desktop, barre de navigation mobile, contexte tenant, profil et accès paiements.
- Dashboard « Quarter Ledger » : revenu du jour/mois, ventes, tickets actifs, santé routeurs, dernières ventes et actions prioritaires.
- Auth refondue en écran éditorial asymétrique, sans fond crème, gradient texte, glassmorphism ni grille de cards génériques.
- Nouvelle page `/payments` : lien du point de vente, résumé mobile money, historique transaction + statut SMS.
- Design toujours piloté par `PRODUCT.md` + `DESIGN.md` (blanc franc, encre, terracotta rare, chiffres mono).

### Phase 1.4 — Mobile money

- `apps/api/src/payments/` : `PaymentsModule`, `PaymentsService`, `CinetpayService`, `SmsService`, contrôleurs privé/public et DTO validés.
- Initialisation CinetPay v2, montant multiple de 5, transaction enregistrée avant redirection, mode mock local par défaut.
- Webhook `x-token` HMAC SHA-256 + vérification serveur-à-serveur `/payment/check` + traitement idempotent.
- Vente et ticket créés/livrés uniquement après statut `ACCEPTED`; refus/annulation invalident le ticket réservé.
- SMS abstrait (local ou passerelle HTTP) avec journal `SmsDelivery`, tentative, statut et identifiant fournisseur.
- Point de vente public `/acheter/[tenantId]` et confirmation `/acheter/[tenantId]/confirmation` avec polling du statut.
- Migration `0002_mobile_money` : `providerTxId` unique, `Payment.saleId` nullable, table RLS `SmsDelivery`.
- Variables ajoutées : `CINETPAY_SECRET_KEY`, `CINETPAY_MOCK`, `SMS_API_URL`, `PUBLIC_API_URL`, `PUBLIC_WEB_URL`.

### Vérifications 2026-07-15

- Typecheck API/web/UI ✓
- Lint web/UI ✓ ; API ✓ avec warnings historiques `consistent-type-imports` uniquement.
- Tests API : 63 verts (60 existants + 3 CinetPay/HMAC).
- Builds API + web ✓ ; routes dynamiques achat/confirmation et route `/payments` incluses.

### Suite immédiate

1. Appliquer la migration `0002_mobile_money` sur PostgreSQL de développement/staging.
2. Renseigner les vraies clés CinetPay et URLs publiques, passer `CINETPAY_MOCK=false`, puis effectuer un paiement sandbox/réel contrôlé.
3. Brancher la passerelle SMS locale choisie dans `SMS_API_URL` et tester les formats CI/GN.
4. Démarrer la Phase 1.5 : FreeRADIUS, accounting et reconciliation ventes ↔ usages.

## État détaillé Phase 1.3 — TERMINÉE

CRUD agents (sous-comptes) + commission % + vente tickets + vue ventes par agent, tout vert.

### Backend agents + sales (items 1.3.1 + 1.3.2)

- `apps/api/src/agents/` — AgentsModule :
  - `agents.service.ts` — create (User role=AGENT + Agent, bypass RLS pour recherche email cross-tenant via ClsService), findAll (avec compteurs tickets/sales), findOne, update (commission %, actif), remove (cascade agent + user). RBAC OWNER only.
  - `agents.controller.ts` — POST/GET/PATCH/DELETE /agents, GET /agents/:id/sales.
- `tickets.service.ts` étendu :
  - `sellTicket` — ISSUED→SOLD + Sale record (commission = price × commissionPercent / 100, channel AGENT). Valide statut, agent actif.
  - `agentSalesSummary` — ventes d'un agent + totaux (montant, commission).
  - `allAgentsSalesSummary` — résumé ventes pour tous les agents.
- `tickets.controller.ts` — POST /tickets/:id/sell, GET /tickets/agent-sales ajoutés.

### Frontend agents (items 1.3.3 + 1.3.4 + 1.3.5)

- `apps/web/src/features/agents/` — types, api (agentsApi, salesApi).
- `(app)/agents/page.tsx` — liste agents (nom, email, commission %, badge actif/inactif, bouton activer/désactiver) + modale d'ajout (nom, email, password, phone, commission %).
- `(app)/agents/[id]/page.tsx` — détail agent : metrics (ventes, total vendu, commission due) + tableau des ventes (code, forfait, montant, commission, date).
- `(app)/tickets/[id]/page.tsx` — bouton « Vendre le ticket » si statut ISSUED (mutation sellTicket, toast avec montant + commission).
- Nav (app) : lien Agents ajouté.

### Tests (item 1.3.6) — 60 tests verts

- `test/agents.service.test.ts` — 7 tests (create succès/email pris, findAll, update commission/actif, remove).
- `test/sell-ticket.test.ts` — 9 tests (sellTicket succès/sans agent/déjà vendu/inexistant/agent inactif/agent absent, agentSalesSummary, allAgentsSalesSummary).
- Tests existants : 44 (auth 11, tenant-isolation 5, mikrotik-connector 8, routers 4, ticket-code 5, push-tickets 4, tickets.service 7).

### Vérifs (item 1.3.7) — tout vert

- `pnpm typecheck` ✓, `pnpm lint` ✓ (0 errors), `pnpm test` ✓ (60 tests), `pnpm build` ✓ (14 routes), dev ✓ (/agents, /tickets, /login → 200).

## État détaillé Phase 1.1 — TERMINÉE

Socle frontend + pages auth + onboarding wizard + backend zones/routers + tests, tout vert.

### Socle frontend (item 1)

- `apps/web/src/lib/config.ts` — `config.apiBaseUrl`, `STORAGE_KEYS.refreshToken` (existant).
- `apps/web/src/lib/api.ts` — `apiFetch` (injecte Bearer, refresh-on-401 dédupé), `ApiError`, `refreshTokens`.
- `apps/web/src/features/auth/types.ts` — `AuthUser`, `TokenPair`, `LoginInput`, `RegisterInput`, `AuthStatus`.
- `apps/web/src/features/auth/store.ts` — Zustand store (accessToken en mémoire, user, status).
- `apps/web/src/features/auth/api.ts` — `authApi` (login, register, me, logout).
- `apps/web/src/features/auth/actions.ts` — `login`, `register`, `logout` (store + localStorage).
- `apps/web/src/features/auth/auth-bootstrap.tsx` — restaure la session au boot (refresh + /me).
- `apps/web/src/features/auth/use-auth.ts` — hook `useAuth` + ré-exports actions.
- `apps/web/src/providers/query-provider.tsx` — React Query (retry 1, staleTime 30s, pas de refetch focus).
- Layouts shell : `(auth)/layout.tsx` (centré max-w-sm, guard redirect /dashboard), `(app)/layout.tsx` (header nav + déconnexion, guard redirect /login).
- `app/page.tsx` — redirect vers /dashboard. `app/showcase/page.tsx` — demo design system déplacée.

### Pages auth (item 3)

- `(auth)/login/page.tsx` — formulaire connexion (email + password), gestion erreurs, toast.
- `(auth)/register/page.tsx` — inscription propriétaire (name, tenantName, email, password, phone, pays CI/GN en radio).

### Onboarding wizard (item 4 + 6)

- `(app)/onboarding/page.tsx` — wizard 3 étapes :
  1. Nommer la zone → `POST /zones`
  2. Connecter le routeur (label, host, apiUser, apiPassword) → `POST /routers/test` puis `POST /routers`
  3. Récap → redirect /dashboard
- `(app)/dashboard/page.tsx` — guard : redirige vers /onboarding si aucun routeur appairé (React Query).
- `features/onboarding/types.ts` + `api.ts` — clients zones/routers (apiFetch).

### Backend zones + routers (item 5)

- `apps/api/src/zones/` — ZonesModule (create, findAll, findOne). tenantId passé via @CurrentUser.
- `apps/api/src/routers/` — RoutersModule :
  - `MikrotikConnectorService` — mode mock (défaut, MIKROTIK_MOCK="true") : valide host/user/pass, simule latence 600ms, retourne modèle. Mode real : node-routeros (/system/identity/get).
  - `RoutersService` — create (test + check zone + encrypt password via CryptoService + persist ONLINE/OFFLINE), test, findAll, findOne.
  - `POST /routers/test` (sans persister), `POST /routers` (crée), `GET /routers`, `GET /routers/:id`.
- `app.module.ts` — ZonesModule + RoutersModule enregistrés.
- `.env.example` — `MIKROTIK_MOCK="true"` ajouté.

### Tests (item 7) — 28 tests verts

- `test/mikrotik-connector.service.test.ts` — 8 tests (mock : OK IP, OK DDNS, échec user fail, échec host 0.0.0.0, validations host/user/password).
- `test/routers.service.test.ts` — 4 tests (create OK → ONLINE, zone introuvable → 404, connexion échouée → OFFLINE, test délègue au connector).
- `test/auth.service.test.ts` — 11 tests (existants).
- `test/tenant-isolation.test.ts` — 5 tests (existants).

### Vérifs (item 8 + 9) — tout vert

- `pnpm lint` ✓ (2 warnings faux positifs sur décorateurs CurrentUser, exit 0).
- `pnpm typecheck` ✓ (api + web + ui).
- `pnpm test` ✓ (28 tests passent).
- `pnpm --filter @mikconnect/web build` ✓ (10 routes, 0 erreur).
- `next dev` ✓ — /login, /register, /onboarding, /dashboard, /showcase → HTTP 200.

## État détaillé Phase 1.4 (Mobile money - Cinetpay) — À DEMARRER

US : intégration Cinetpay (CI : Orange/MTN/Moov/Wave ; GN : Orange/MTN/Sudi), page d'achat publique, webhook idempotent, SMS du code au client.

## Détails techniques importants

- pnpm 9.15.9 (pas corepack). `npm install -g pnpm@9`.
- Pas de repo git initialisé (husky init échoue : ".git can't be found").
- API non démarrée sans Postgres (PrismaService.$connect échouerait). Migrations versionnées manuellement.
- Next dev : `apps/web/node_modules/.bin/next.cmd dev` en arrière-plan (HTTP 200 :3000 validé).
- Versions : Next 15.5.20, React 18.3, Tailwind v4, Prisma 5.22, NestJS 10.4, Vitest 2.
- Web consomme `@mikconnect/ui` (workspace). globals.css importe theme.css + `@source ../../../packages/ui/src`.
- Frontend auth : access token en mémoire (Zustand), refresh en localStorage. Refresh-on-401 dédupé dans api.ts.
- Backend zones/routers : tenantId passé explicitement via @CurrentUser (Prisma exige le champ NOT NULL, RLS positionne app.tenant_id en plus).
- MiktotikConnectorService : mock par défaut (MIKROTIK_MOCK !== "false"). Cas démo : user "fail" → refus, host "0.0.0.0" → injoignable.
- ESLint API : 2 warnings `consistent-type-imports` sur `CurrentUser` (décorateur) — faux positifs (le linter ne reconnaît pas l'usage décorateur sans experimentalDecorators dans parserOptions). Exit 0, ne bloque pas.

## Envs API (`.env` manquant, exemple dans `apps/api/.env.example`)

DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_TTL, JWT_REFRESH_TTL,
MIKROTIK_ENCRYPTION_KEY (32 bytes hex), MIKROTIK_MOCK ("true" défaut dev),
CINETPAY__, SMS__, RADIUS_DB_URL, REDIS_URL, PORT=4000, CORS_ORIGIN=http://localhost:3000.

## Fichiers de référence

- `PRODUCT.md`, `DESIGN.md` (racine) — stratégie + tokens/anti-refs.
- `packages/ui/src/styles/tokens.css` — tokens OKLCH source of truth.
- `packages/ui/src/styles/theme.css` — @theme inline Tailwind v4.
- `packages/ui/src/index.ts` — exports composants.
- `apps/api/src/auth/auth.service.ts` — register/login/refresh (rotation + réutilisation).
- `apps/api/src/prisma/prisma.service.ts` — withTenantContext + RLS (SET LOCAL app.tenant_id).
- `apps/api/src/zones/` — ZonesModule (create, findAll, findOne).
- `apps/api/src/routers/` — RoutersModule + MikrotikConnectorService (mock/real, pushTickets hotspot users).
- `apps/api/src/tickets/` — TicketsModule (génération batch, codes CSPRNG, CRUD, filtres, stats, sellTicket, agentSalesSummary).
- `apps/api/src/plans/` — PlansModule (forfaits actifs du tenant).
- `apps/api/src/agents/` — AgentsModule (CRUD agents = User+Agent, commission %, RBAC OWNER).
- `apps/api/prisma/schema.prisma` — modèles + RefreshToken.
- `apps/api/prisma/migrations/0001_init/migration.sql` — DDL + RLS policies.
- `apps/api/prisma/seed.ts` — 2 tenants démo CI/GN.
- `apps/web/src/lib/api.ts` — fetcher avec refresh-on-401 dédupé.
- `apps/web/src/features/auth/` — store, api, actions, bootstrap, use-auth.
- `apps/web/src/features/onboarding/` — types, api (zones/routers).
- `apps/web/src/features/tickets/` — types, api (plans/tickets), format (montants, durées, statuts).
- `apps/web/src/features/agents/` — types, api (agents, sales).
- `apps/web/src/app/(auth)/` — login, register, layout shell.
- `apps/web/src/app/(app)/` — dashboard, onboarding, tickets (liste/new/[id]), agents (liste/[id]), zones.
- `apps/web/src/app/showcase/page.tsx` — démo design system (hors auth).
- `docs/PLAN.md` — phasage Phase 0→3, US1-7, écrans prioritaires.
- `docs/PRD.md`, `ARCHITECTURE.md`, `CONCURRENTS.md` — référence produit/tech/marché.

## À faire au redémarrage

1. Relire ce fichier + PRODUCT.md + DESIGN.md.
2. Vérifier état : `pnpm lint && pnpm typecheck && pnpm test`.
3. Démarrer Phase 1.4 (Mobile money - Cinetpay) :
   - Backend : CinetpayService (init paiement, webhook idempotent), page d'achat publique.
   - SMS : envoi du code au client après paiement.
   - Frontend : page d'achat publique (choix forfait, paiement mobile money).
4. Continuer selon docs/PLAN.md Phase 1.4 → 1.10.

## Passage design Impeccable — polish + mode sombre

- Le thème clair reste le défaut (usage extérieur) ; un mode sombre chaud,
  volontaire et persistant est disponible sur les shells authentifiés,
  d'authentification et d'achat public.
- Les tokens partagés exposent désormais `canvas`, `inverse` et la palette
  sombre complète ; le thème est appliqué avant le rendu pour éviter le flash.
- Le dashboard revenus a été recomposé en grand livre asymétrique plutôt qu'en
  grille de métriques générique. Les surfaces inversées restent stables dans
  les deux thèmes.
- Les cibles mobiles, rayons, tracking, contraste et transitions ont été
  harmonisés selon les règles de `DESIGN.md`.

## Dashboard, revendeurs et vouchers — juillet 2026

- Le dashboard propriétaire sépare désormais les ventes et revenus physiques
  des paiements mobile money provenant du portail captif. Les paiements acceptés
  créent une vente, qui remonte automatiquement dans les totaux et tendances.
- Les graphiques montrent 14 jours de revenus par canal et 7 jours de sessions
  RADIUS. La table MikroTik du dashboard expose utilisateur, IP, MAC, durée,
  temps restant et trafic entrant/sortant, avec rafraîchissement périodique.
- Les états de chargement principaux utilisent des squelettes ; Manrope et
  JetBrains Mono sont servies localement pour éviter la dépendance Google Fonts.
- L'accès profil est centralisé dans le menu avatar du header. Le profil est
  modifiable (nom, téléphone, espace de travail, pays/devise et thème).
- Les agents ont un espace séparé `/agent`. Le propriétaire attribue un stock de
  tickets, l'agent confirme ses ventes, télécharge ses vouchers et suit sa
  commission. Les routes API de tickets sont protégées par rôle.
- Les nouveaux codes sont compacts, sans tirets. L'export PDF produit une feuille
  A4 de 8 vouchers découpables inspirée des conventions Omada/UniFi : code dominant,
  durée, volume, nombre d'appareils, prix et instructions. Le rendu a été contrôlé.
- Les sessions Hotspot proposent désormais deux actions propriétaire : déconnecter
  (`/ip/hotspot/active/remove`) et bloquer par MAC (`ip-binding type=blocked`), avec
  confirmation, feedback et resynchronisation du tableau.
- Le dashboard affiche uniquement la dernière vente dans un widget synchronisé
  toutes les 15 secondes ; une nouvelle vente déclenche une animation discrète.
- Le design system est passé d'une palette terracotta/teal à un système graphite +
  bleu signal plus sobre. La police d'interface est Inter auto-hébergée.
- Validation : TypeScript API/web vert, 68 tests API verts, détecteur Impeccable sans
  signalement, parcours dashboard sans erreur console, endpoint de déconnexion testé.
- Limite restante : la compatibilité du connecteur doit encore être validée sur
  des routeurs physiques RouterOS 6/7 et avec les services de paiement réels.
