# PRD — mikconnect

> Produit : plateforme SaaS multi-tenant de gestion de zones WiFi pour
> propriétaires (Côte d'Ivoire & Guinée-Conakry).
> Version : MVP v1 — juillet 2026.
> Statut : validé après étude concurrentielle (voir `CONCURRENTS.md`).

## 1. Vision

Plateforme SaaS multi-tenant permettant aux propriétaires de **zones WiFi**
de gérer leurs routeurs **Mikrotik**, de **vendre des accès** (tickets agents

- mobile money direct), et de **piloter leur revenu** (temps réel + mensuel +
  reconciliation), depuis un téléphone, en français, en FCFA / GNF.

Tagline : **"Pilotez vos zones WiFi, vendez plus, gardez le contrôle."**

## 2. Personas

| Persona               | Description                                                       | Contexte technique       | Besoins clés                                                                                   |
| --------------------- | ----------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------- |
| **Propriétaire**      | 1-5 zones WiFi de quartier, gère depuis smartphone, peu technique | Connait Mikrotik de base | Dashboard revenu, créer/vendre tickets, gérer agents, voir écarts, rapport mensuel, abonnement |
| **Agent / revendeur** | Vend en cash autour de la zone, perçoit une commission            | Smartphone basique       | Vendre/générer tickets vite, voir ses ventes + commission due, s'auto-suivre                   |
| **Client final**      | Achète un accès WiFi prépayé                                      | Téléphone, mobile money  | Payer Orange/MTN/Wave/Moov → recevoir code SMS, ou acheter ticket à un agent                   |
| **Admin mikconnect**  | Éditeur / support                                                 | Technique                | Gérer tenants, paliers, paiements, support, métriques plateforme                               |

## 3. Problèmes adressés

- Gestion manuelle des tickets (User Manager Mikrotik) chronophage et
  erreur-prone.
- Pas de visibilité du revenu en temps réel ni de reconciliation
  ventes ↔ usages → fuites de revenus et fraude agent non détectée.
- Aucune solution grand public avec **mobile money local** (Orange, MTN,
  Moov, Wave en CI ; Orange, MTN, Sudi en GN).
- Outils mondiaux (Tanaza, HotspotSystem) trop chers, trop complexes, non
  localisés (devise, langue, paiements).
- Solutions locales (Smart Hand) fermées, limitées géographiquement, UI
  inégale.

## 4. Objectifs & métriques de succès (6 mois post-lancement MVP)

| Objectif               | Métrique                 | Cible            |
| ---------------------- | ------------------------ | ---------------- |
| Acquisition            | Tenants actifs           | 200              |
| Usage                  | Tickets générés / mois   | 20 000           |
| Monétisation           | Tenants au palier payant | 40 %             |
| Fiabilité              | Uptime plateforme        | 99,5 %           |
| Qualité reconciliation | Écart agent < 2 %        | 95 % des tenants |
| Satisfaction           | NPS                      | > 40             |
| Performance            | Dashboard sur 3G         | < 1,5 s          |

## 5. Périmètre

### 5.1 MVP (Phase 1)

**Onboarding & compte**

- Inscription propriétaire, choix du pays (CI / GN), devise associée
  (XOF / GNF), forfaits d'accès par défaut.
- Pairing routeur Mikrotik : identifiants API RouterOS + IP/DDNS, test de
  connexion, stockage chiffré des credentials, sync hotspot.

**Tickets**

- Génération par lot (batch) : ex. 50 tickets "1 h", 50 "1 jour".
- Codes alphanumériques sécurisés, statuts (émis / vendu / utilisé /
  expiré), push vers le routeur (RADIUS).
- Impression de tickets (feuille imprimable, QR code).

**Vente — canal agents**

- Création d'agents (sous-comptes), commission % configurable.
- Agent génère / vend des tickets, suivi de ses ventes + commission due.

**Vente — canal mobile money direct**

- Page d'achat : client paie via **Cinetpay** (Orange/MTN/Moov/Wave en CI ;
  Orange/MTN/Sudi en GN) → webhook de confirmation idempotent → génération
  du code → **SMS** au client.

**Dashboard propriétaire**

- Revenu du jour / mois en cours (devise du tenant).
- Tickets actifs, top zones, état routeur (en ligne / hors ligne).
- Reconciliation simple : tickets émis vs vendus vs utilisés, alerte écart.
- Rapport mensuel PDF exportable (revenu, commissions, tickets par forfait).

**Abonnement**

- Paliers (gratuit limité + payant), souscription mobile money.

**Plateforme**

- PWA mobile-first (installable, offline lecture du dashboard).
- Multi-devise XOF / GNF, paliers par devise.
- i18n FR par défaut, structure EN / PT prête.
- Multi-tenant avec isolation par `tenant_id` + RLS Postgres.

### 5.2 V2 (Phase 2)

- Multi-zones par tenant (illimité selon palier) + switcher de zone.
- Alertes coupure / déconnexion routeur, quotas bande passante (push config
  Mikrotik).
- Notifications push (PWA) + SMS (fin de forfait, écart agent).
- Facturation récurrente de l'abonnement (mobile money).
- Panneau admin mikconnect (tenants, paliers, support, métriques).
- Export comptabilité CSV + rapports personnalisés (plage de dates).
- Historique des sessions clients (durée, data consommée).

### 5.3 V3 (Phase 3)

- Multi-vendor (Ubiquiti, OpenWrt) via abstraction RADIUS.
- White-label / distributeurs de la plateforme (sous-plateformes marquées).
- USSD pour agents en feature-phone.
- API publique + webhooks + documentation.
- Analytics avancés (prévision de revenu, churn clients).
- Extension pays (Sénégal, Mali, Burkina, Cameroun, RDC) + devises.

## 6. User stories clés (MVP)

- **US1** : En tant que propriétaire, je crée mon compte, choisis mon pays
  et je connecte mon routeur Mikrotik pour vérifier la liaison.
- **US2** : En tant que propriétaire, je génère un lot de 50 tickets "1 h"
  à 100 XOF et je les imprime.
- **US3** : En tant qu'agent, je me connecte, je vends un ticket "1 jour"
  à un client et je vois ma commission due.
- **US4** : En tant que client, je paie 500 XOF via Orange Money sur la
  page d'achat et je reçois mon code par SMS.
- **US5** : En tant que propriétaire, je vois mon revenu du jour et du
  mois, et une alerte m'avertit d'un écart sur les ventes d'un agent.
- **US6** : En tant que propriétaire, j'exporte mon rapport mensuel en PDF.
- **US7** : En tant que propriétaire, je passe au palier payant
  (abonnement mensuel mobile money).

## 7. Forfaits d'accès (configurables par tenant)

Forfaits = {durée, data, prix}. Exemples par défaut :

| Forfait      | Durée | Prix CI (XOF) | Prix GN (GNF) |
| ------------ | ----- | ------------- | ------------- |
| Express      | 1 h   | 100           | 1 000         |
| Demi-journée | 6 h   | 300           | 3 000         |
| Journalier   | 1 j   | 500           | 5 000         |
| Hebdo        | 7 j   | 2 000         | 20 000        |

## 8. Paliers d'abonnement mikconnect (orientés petit propriétaire)

| Palier   | Prix                            | Limites                                               | Inclus                                                           |
| -------- | ------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| Gratuit  | 0                               | 1 zone, 200 tickets / mois, 1 agent                   | Dashboard, tickets, agents, reconciliation                       |
| Pro      | ~5 000 XOF / 25 000 GNF / mois  | 5 zones, 5 000 tickets / mois, 5 agents               | + Rapports PDF, alertes, mobile money direct                     |
| Business | ~15 000 XOF / 75 000 GNF / mois | Zones illimitées, tickets illimités, agents illimités | + Export compta, notifications, multi-zones, support prioritaire |

> Paliers exacts à valider en pricing review. Le palier gratuit existe pour
> réduire la friction d'acquisition (le bouche-à-oreille reste le canal n°1).

## 9. Contraintes & exigences non-fonctionnelles

- **Offline / résilience** : tickets pré-générés pushés au routeur →
  l'auth RADIUS fonctionne même si le cloud est down ; reconciliation à la
  reconnexion.
- **Sécurité** : credentials Mikrotik chiffrés au repos (AES), secrets en
  vault, RBAC (owner / agent / admin), JWT + refresh rotation, rate-limit,
  logs d'audit.
- **Multi-tenant** : isolation par `tenant_id` + Row-Level Security Postgres
  - tests d'isolation automatisés.
- **Conformité** : RGPD-lite (consentement, export / suppression des données
  client).
- **Performance** : dashboard < 1,5 s sur 3G, génération 1 000 tickets < 3 s.
- **i18n** : FR par défaut, structure EN / PT prête (textes externalisés).
- **Accessibilité** : WCAG AA (le design sera piloté par le skill
  Impeccable, anti-AI-slop).
- **Devise** : XOF (CI) et GNF (GN) via `Intl.NumberFormat`.

## 10. Risques & mitigations

| Risque                                        | Mitigation                                                 |
| --------------------------------------------- | ---------------------------------------------------------- |
| API Mikrotik instable / IP dynamique          | Support DDNS, timeout + retry, file offline                |
| Cinetpay indisponible                         | File d'attente + retry, statut transactionnel idempotent   |
| SMS non reçu                                  | Multi-fournisseurs (fallback), retry, journal de livraison |
| Fraude agent                                  | Reconciliation + alertes d'écart + plafonds                |
| Abonnement fixe = friction d'acquisition      | Palier gratuit généreux + essai 30 j palier supérieur      |
| Détecteur anti-slop Impeccable bloque le flow | Désactivations ciblées documentées (`impeccable-disable`)  |

## 11. Hors périmètre MVP (explicitement exclus)

- Paiement carte bancaire (V2+ si demande).
- Multi-vendor Ubiquiti / OpenWrt (V3).
- Application native iOS / Android (la PWA suffit au lancement).
- USSD (V3).
- Marketplace d'apps (hors sujet).
- Gestion de bande passante avancée / QoS fine (V2 limité).

## 12. Design

Le design system est **produit par le skill Impeccable** via
`/impeccable init` (lane **product**), puis affiné par les commandes
`shape`, `critique`, `audit`, `polish` pendant le dev UI. Aucun
`DESIGN_SYSTEM.md` rédigé à la main (anti-AI-slop). Voir
`ARCHITECTURE.md` § frontend et `PLAN.md` étape 2.
