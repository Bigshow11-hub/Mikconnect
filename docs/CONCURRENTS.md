# Étude concurrentielle — mikconnect

> Marché : gestion de zones WiFi / hotspot billing en Afrique francophone
> (focus Côte d'Ivoire & Guinée-Conakry pour le lancement).
> Date : juillet 2026.

## 1. Cartographie du marché

Le marché se découpe en 4 familles de solutions, de la plus brute à la plus
élaborée. En Afrique francophone, **Mikrotik est le hardware dominant**
(part de marché estimée > 80 % chez les propriétaires de zones WiFi de
quartier), ce qui influence toute la concurrence.

| Famille                     | Exemples                                              | Positionnement                           |
| --------------------------- | ----------------------------------------------------- | ---------------------------------------- |
| Hotspot natif routeur       | Mikrotik User Manager, Hotspot RouterOS               | Gratuit, embarqué dans le routeur        |
| Billing RADIUS auto-hébergé | Daloradius, Radius Manager, LogiSD                    | Auto-hébergement, complet mais UI datée  |
| SaaS cloud multi-vendor     | Tanaza, HotspotSystem.com                             | Cloud, multi-vendor, B2B/MSP             |
| Solutions locales AF        | Smart Hand (RDC), YooMee (CM), Atomux, scripts maison | Localisées mais fermées ou orientées FAI |

## 2. Fiches concurrents

### 2.1 Mikrotik Hotspot + User Manager (natif RouterOS)

- **Modèle** : gratuit, intégré à RouterOS. Dominant en AF.
- **Forces**
  - Coût nul, robuste, fonctionne offline (tout est dans le routeur).
  - Compatibilité totale avec le hardware Mikrotik déjà en place.
  - Hotspot + User Manager + billing basique natifs.
- **Faiblesses pour notre marché**
  - UI datée (Winbox / WebFig), pas mobile-friendly.
  - Pas de multi-zones cloud : chaque routeur est isolé.
  - Pas de mobile money local, paiement uniquement cash / tickets manuels.
  - Gestion des agents/revendeurs et commissions inexistante.
  - Aucun rapport mensuel consolidé, aucune reconciliation ventes ↔ usages.
- **Leçon pour mikconnect** : ne pas réinventer le routeur, mais **apporter
  la couche cloud + mobile money + reconciliation** que Mikrotik n'a pas.

### 2.2 Tanaza

- **Modèle** : SaaS cloud multi-vendor (Mikrotik, Ubiquiti, Edgecore…), B2B
  pour MSP et ISP. Disponible en français.
- **Forces**
  - Très complet : configuration centralisée, monitoring temps réel,
    marketplace d'apps (social login, monetization, content filtering).
  - Multi-tenant, multi-vendor, API SDN.
  - Support FR, documentation solide.
- **Faiblesses pour notre marché**
  - Facturation en USD/EUR, trop cher pour le petit propriétaire de quartier.
  - Trop complexe (courbe d'apprentissage), pensé MSP/ISP pas "zone de
    quartier".
  - Pas de mobile money africain natif.
  - Pas de modèle agents/revendeurs avec commissions en cash.
- **Leçon** : la complétude a un coût (complexité + prix). mikconnect gagne
  sur la **simplicité mobile-first + prix local + mobile money**.

### 2.3 HotspotSystem.com

- **Modèle** : SaaS cloud hotspot + billing, compatible Mikrotik, DD-WRT,
  Ubiquiti. Disponible en français.
- **Forces**
  - Vouchers / tickets, billing, social login, SMS login.
  - Programme revendeur / white-label.
  - Cloud-based, pas de serveur à gérer.
- **Faiblesses pour notre marché**
  - Pas pensé Afrique : paiement carte bancaire, pas de mobile money local.
  - Paliers en USD, pas de FCFA / GNF.
  - UI desktop-centric, pas optimisé téléphone 3G.
- **Leçon** : le modèle voucher/agent existe ailleurs, mais **aucun ne
  propose mobile money + FCFA/GNF + UI mobile-first**. C'est le trou de
  marché de mikconnect.

### 2.4 Smart Hand (RDC)

- **Modèle** : SaaS zones WiFi, marché congolais, très localisé.
- **Forces**
  - Bien adapté au contexte africain (mobile money, tickets, agents).
  - Notoriété en RDC.
- **Faiblesses**
  - Solution fermée, peu de transparence tarifaire.
  - Couverture géographique limitée (RDC principalement).
  - UI inégale, pas toujours mobile-first.
- **Leçon** : prouve la demande pour ce type de solution en AF.
  mikconnect se différencie par la **transparence (paliers publics), la
  multi-devise (XOF/GNF), et l'UI soignée (skill Impeccable)**.

### 2.5 YooMee (Cameroun)

- **Modèle** : opérateur WiFi public B2C, pas une SaaS pour propriétaires.
- **Forces** : notoriété, réseau déployé.
- **Faiblesses** : pas un outil pour les propriétaires indépendants.
- **Leçon** : valide l'appétit du consommateur final pour le WiFi prépayé.

### 2.6 Atomux / billing ISP

- **Modèle** : billing orienté FAI/ISP en Afrique.
- **Forces** : complet pour un FAI.
- **Faiblesses** : trop "ISP", pas "zone de quartier".
- **Leçon** : confirme l'existence d'un segment "petit propriétaire" mal
  servi par les outils ISP.

### 2.7 Daloradius / Radius Manager / LogiSD

- **Modèle** : billing RADIUS auto-hébergé.
- **Forces** : complets, flexibles, standards RADIUS.
- **Faiblesses** : UI lourde, hébergement à gérer, peu localisés, pas de
  mobile money.
- **Leçon** : **RADIUS est le bon standard technique** (auth + accounting).
  mikconnect réutilise FreeRADIUS mais apporte l'UI, le cloud, le mobile
  money.

### 2.8 Solutions "maison" (scripts PHP/Python sur API Mikrotik)

- **Modèle** : scripts sur-mesure développés par chaque opérateur.
- **Forces** : sur-mesure.
- **Faiblesses** : non standardisés, non maintenus, pas de multi-tenant,
  pas sécurisés.
- **Leçon** : le marché est **fragmenté et sous-équipé**. Une solution
  standardisée, propre, a un potentiel d'agrégation fort.

## 3. Matrice comparative (besoins clés du marché AF)

| Besoin                                    | Mikrotik UM | Tanaza | HotspotSystem | Smart Hand | Atomux | mikconnect |
| ----------------------------------------- | :---------: | :----: | :-----------: | :--------: | :----: | :--------: |
| Mobile money local (Orange/MTN/Wave/Moov) |      —      |   —    |       —       |     ◐      |   —    |     ✅     |
| Multi-devise XOF / GNF                    |      —      |   —    |       —       |     ◐      |   ◐    |     ✅     |
| UI mobile-first (PWA, 3G)                 |      —      |   ◐    |       ◐       |     ◐      |   —    |     ✅     |
| Tickets via agents + commissions          |      ◐      |   ◐    |       ◐       |     ✅     |   ◐    |     ✅     |
| Achat direct mobile money → SMS           |      —      |   —    |       —       |     ◐      |   —    |     ✅     |
| Dashboard revenu temps réel               |      —      |   ✅   |       ◐       |     ◐      |   ◐    |     ✅     |
| Reconciliation ventes ↔ usages            |      —      |   —    |       —       |     ◐      |   ◐    |     ✅     |
| Rapport mensuel + export compta           |      —      |   ◐    |       ◐       |     —      |   ✅   |     ✅     |
| Multi-zones + multi-tenant cloud          |      —      |   ✅   |      ✅       |     ◐      |   ◐    |     ✅     |
| Résilience offline (router garde tickets) |     ✅      |   ◐    |       ◐       |     ◐      |   ◐    |     ✅     |
| Tarification locale abordable             |     ✅      |   —    |       —       |     ◐      |   ◐    |     ✅     |

Légende : ✅ = natif — ◐ = partiel — — = absent.

## 4. Opportunité / "le trou de marché"

Aucune solution existante ne combine simultanément :

1. **Mobile money local natif** (Orange/MTN/Moov/Wave en CI ;
   Orange/MTN/Sudi en GN) via un agrégateur (Cinetpay).
2. **Multi-devise XOF + GNF** avec paliers d'abonnement par pays.
3. **UI mobile-first PWA** optimisée pour téléphone 3G, en français.
4. **Modèle agents/revendeurs avec commissions** + reconciliation
   anti-fraude.
5. **Tarification locale abordable** (palier gratuit + abonnement FCFA/GNF).
6. **Résilience offline** : tickets pré-pushés au routeur, auth RADIUS
   fonctionne même si le cloud tombe.

## 5. Positionnement mikconnect

> **"Le copilote mobile du propriétaire de zone WiFi."**

mikconnect ne remplace pas Mikrotik (le routeur reste le cœur réseau),
mikconnect **surcouche** : gestion cloud, vente (agents + mobile money),
pilotage du revenu, reconciliation, rapports — depuis un téléphone,
en français, en FCFA/GNF, sans AI slop dans le design (skill Impeccable).

## 6. Risques concurrentiels

| Risque                                               | Mitigation                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| Mikrotik améliore son cloud (Mikrotik Cloud / TR069) | Avance sur mobile money + UX + multi-pays ; lock-in faible côté hardware       |
| Tanaza descend en marché (plan moins cher)           | Avance locale (mobile money, devise, langue, support de proximité)             |
| Solutions maison gratuites                           | Valeur = temps gagné + fraude évitée + revenu visible ; freemium pour basculer |
| Smart Hand s'étend à la CI/GN                        | Vitesse d'exécution + qualité UI (Impeccable) + multi-devise natif             |

## 7. Conclusion

Le marché est **fragmenté et sous-équipé** côté petit propriétaire. Les
solutions mondiales sont trop chères/complexes et non localisées ; les
solutions locales sont fermées ou limitées géographiquement ; le natif
Mikrotik est gratuit mais sans couche cloud/mobile money/reconciliation.
**mikconnect se positionne sur ce segment avec un MVP ciblé CI + Guinée,
mobile money via Cinetpay, multi-devise, PWA mobile-first, et un design
anti-slop via le skill Impeccable.**
