---
target: Digiconnect comparé à mikconnect
total_score: 29
p0_count: 0
p1_count: 4
timestamp: 2026-07-19T14-52-49Z
slug: dighiconnect-com-app
---

# Audit comparatif Digiconnect / mikconnect

## Design Health Score de mikconnect

| #         | Heuristique                      |     Score | Point principal                                                                                                 |
| --------- | -------------------------------- | --------: | --------------------------------------------------------------------------------------------------------------- |
| 1         | Visibilité du statut             |         3 | Synchronisation, paiement et routeur sont explicités, mais la couverture hors ligne reste surtout consultative. |
| 2         | Correspondance avec le terrain   |         3 | Français, mobile money et vocabulaire WiFi local ; l’onboarding MikroTik reste technique.                       |
| 3         | Contrôle et liberté              |         3 | Annulation des invendus, retry, filtres et retéléchargement ; peu d’undo global.                                |
| 4         | Cohérence et standards           |         3 | Shell et composants partagés cohérents.                                                                         |
| 5         | Prévention des erreurs           |         3 | Idempotence, contraintes serveur et confirmations protègent les parcours critiques.                             |
| 6         | Reconnaissance plutôt que rappel |         2 | Réseau WiFi et utilisateurs en ligne disparaissent de la navigation mobile.                                     |
| 7         | Flexibilité et efficacité        |         3 | Lots, filtres, exports, partage et retry ; pas de palette de commandes ni raccourcis.                           |
| 8         | Esthétique et minimalisme        |         3 | Direction sobre et lisible ; dashboard encore proche du modèle SaaS à cartes KPI.                               |
| 9         | Diagnostic et récupération       |         3 | Erreurs contextualisées et reprises explicites, sans centre de diagnostic routeur complet.                      |
| 10        | Aide et documentation            |         3 | Centre d’aide présent, mais peu d’aide contextuelle dans les écrans techniques.                                 |
| **Total** |                                  | **29/40** | **Bon socle ; lacunes d’exploitation terrain.**                                                                 |

## Verdict anti-patterns

Mikconnect ne donne pas l’impression d’un produit générique : son registre de ledger réseau, ses codes monospaces, sa palette retenue et ses flux terrain lui donnent une identité propre. Les restes génériques sont la grille de KPI, l’usage fréquent de panneaux bordés et certaines compositions d’administration standard.

Digiconnect a une identité visuelle forte mais plus bruyante : fond sombre, accents bleus/violets/verts, cartes colorées et une navigation de plus de quinze entrées. Le volume de modules augmente la perception de puissance, mais réduit la hiérarchie. Le tableau de bord observé affiche aussi des ratios incohérents, par exemple 7 utilisations pour 3 tickets créés, ce qui fragilise la confiance.

Le détecteur statique Impeccable a retourné zéro règle sur `apps/web/src` et `packages/ui/src`. Ce résultat ne remplace ni un audit WCAG runtime ni une mesure 3G.

## Impression générale

Digiconnect paraît plus large ; mikconnect paraît plus fiable. L’opportunité n’est pas de reproduire toute sa navigation, mais de faire de mikconnect le meilleur outil d’exploitation quotidienne : une vente fiable, un routeur compréhensible et un incident résolu sans technicien.

## Ce qui fonctionne déjà dans mikconnect

- Le parcours lots est plus profond : génération idempotente jusqu’à 1 000 tickets, PDF avec QR, historique immuable, retéléchargement, annulation des invendus, journal et reprise de synchronisation.
- L’architecture opérationnelle relie vente, paiement, agent, routeur, RADIUS, rapports et confidentialité au lieu de juxtaposer des écrans.
- Le mobile est structurel : cartes plutôt que table tronquée pour les tickets, navigation basse, PWA, grandes cibles tactiles et partage natif.

## Écarts fonctionnels observés

| Capacité                 | Digiconnect                                                                   | mikconnect                                                        | Décision                                                            |
| ------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| Dépannage RouterOS guidé | Horloge, expiration, verrouillage MAC, nettoyage Mikhmon, scripts et sessions | Aide textuelle et test routeur, sans centre d’actions correctives | Construire une version sécurisée et progressive.                    |
| Monitoring partageable   | Liens publics tokenisés, auto-refresh et gestion des accès                    | Rapports authentifiés seulement                                   | Ajouter des vues lecture seule avec expiration et révocation.       |
| Contrôle de contenu      | Blocage DNS par domaine                                                       | Absent                                                            | Ajouter après le centre réseau, avec limites clairement expliquées. |
| Accès appareils          | Module d’accès distant                                                        | Absent                                                            | Étudier un tunnel sécurisé, jamais exposer directement RouterOS.    |
| Support client           | Widget, statut voucher, récupération de code, WhatsApp                        | Centre d’aide propriétaire                                        | Ajouter une page publique d’assistance voucher avant un bot.        |
| Revendeurs               | Recherche par nom/localisation et performance                                 | Agents, commissions, ventes et attribution                        | Ajouter localisation et comparaison de performance.                 |
| Abonnement               | Renouvellement, jours restants et tarification par zone                       | Quotas et état d’abonnement, paiement incomplet                   | Finir le renouvellement mobile money.                               |
| Boutique communautaire   | Portails captifs, routeurs et équipements                                     | Absente                                                           | Ne pas prioriser pour le MVP.                                       |
| Android natif            | Application Google Play                                                       | PWA                                                               | Conserver la PWA jusqu’à preuve d’un besoin natif.                  |

## Problèmes prioritaires

### [P1] Absence de centre d’exploitation routeur

**Pourquoi :** un propriétaire sait qu’un routeur est hors ligne, mais ne dispose pas d’un diagnostic guidé ni d’actions correctives contrôlées. Digiconnect couvre ce moment critique.

**Correction :** créer un Centre réseau avec diagnostic lecture seule, horloge/fuseau, RADIUS, expiration, utilisateurs aliens et files de synchronisation. Toute mutation doit afficher un aperçu d’impact, exiger une confirmation renforcée et produire un audit. Les actions de type « tout effacer » ne doivent pas apparaître dans le parcours normal.

### [P1] Monitoring externe non partageable

**Pourquoi :** les investisseurs, partenaires ou techniciens doivent se connecter au compte principal pour voir des chiffres simples.

**Correction :** ajouter des liens de monitoring lecture seule, limités à une ou plusieurs zones, avec permissions par métrique, expiration, révocation, journal d’accès et masquage des données personnelles.

### [P1] Assistance client final trop faible

**Pourquoi :** un client qui perd son code ou ne comprend pas son statut sollicite directement l’exploitant.

**Correction :** créer une page publique « Aide pour mon ticket » permettant de vérifier temps/data restant, statut, motif d’échec et renvoi contrôlé du code après vérification du téléphone. Ajouter WhatsApp en escalade, pas comme unique solution.

### [P1] Navigation mobile incomplète

**Pourquoi :** les deux surfaces les plus terrain, `/zones` et `/online`, sont absentes de la barre basse.

**Correction :** regrouper `/zones`, `/online`, diagnostic et synchronisations dans un onglet « Réseau » ; garder cinq destinations mobiles maximum.

### [P2] Abonnement commercial incomplet

**Pourquoi :** l’usage est plafonné, mais l’exploitant ne peut pas renouveler son offre de manière autonome.

**Correction :** ajouter renouvellement mobile money, jours restants, période d’essai, retard, historique de facturation et grâce contrôlée.

### [P2] Lisibilité et accessibilité des données

**Pourquoi :** 28 usages de textes 9–11 px sont risqués au soleil ; certains graphes reposent surtout sur le visuel et une animation modifie `height`.

**Correction :** texte critique de 13–14 px, résumé tabulaire accessible des graphes, annonces `aria-live` et animation par transform/clip-path ou sans mouvement.

## Personas

**Alex, exploitant expérimenté :** mikconnect lui donne lots, filtres, exports et reprise, mais pas de palette de commandes ni de diagnostic bulk. Digiconnect lui donne davantage d’actions routeur, au prix d’une navigation lourde et d’actions destructrices trop exposées.

**Jordan, nouveau propriétaire :** il comprend mieux le wizard mikconnect, puis rencontre le jargon hôte/API/port. Un diagnostic automatique et une configuration progressive réduiraient l’abandon.

**Casey, agent sur Android/3G :** la navigation basse et les cartes mikconnect sont plus adaptées que la table horizontale observée dans Digiconnect. Il lui manque cependant un accès immédiat au réseau et une vraie file de mutations hors ligne.

## Observations secondaires

- Le dashboard mikconnect doit remplacer la rangée uniforme de KPI par une hiérarchie opérationnelle : argent disponible, problèmes à traiter, activité récente.
- Un sélecteur de langue manque alors que les catalogues FR/EN/PT existent.
- Les rapports et graphiques doivent offrir une vue texte/tableau équivalente.
- Les refresh fréquents et nombreuses surfaces client-side doivent être mesurés sur Android 3G.
- La marketplace, les services d’installation et l’application native ne sont pas des priorités MVP.

## Questions stratégiques

- Mikconnect doit-il devenir un outil de vente de tickets ou le cockpit complet de l’exploitant WiFi ?
- Quelles actions routeur peuvent être automatisées sans exposer une possibilité de panne massive ?
- Un partenaire externe a-t-il besoin de toutes les données, ou seulement de revenu, disponibilité et activité d’une zone ?
