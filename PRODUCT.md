# Product

## Register

product

## Platform

web

## Users

Le **propriétaire de zone WiFi** est l'utilisateur primaire. Il exploite
1 à 5 zones de quartier en Côte d'Ivoire ou en Guinée-Conakry, gère son
activité depuis un smartphone Android d'entrée de gamme souvent en 3G/4G,
et connaît Mikrotik de base sans être technicien. Son contexte d'usage est
le terrain : il est dans ou près de la zone, en déplacement, parfois en
extérieur. Le job à faire : piloter son revenu en temps réel, créer et
vendre des tickets, gérer ses agents, détecter les écarts, exporter son
rapport mensuel — sans jamais devoir ouvrir Winbox ou WebFig.

L'**agent / revendeur** est l'utilisateur secondaire. Il vend en cash autour
de la zone sur un smartphone basique. Son job : vendre ou générer un ticket
vite, voir ses ventes et sa commission due, s'auto-suivre. L'UI agent est
une vue dépouillée de l'UI propriétaire, pas une app séparée.

La **page d'achat publique** sert un utilisateur qui n'est pas un user du
SaaS : le **client final**, qui paie en mobile money (Orange, MTN, Wave,
Moov, Sudi) et reçoit son code par SMS. Cette surface parle au grand public
et doit rester lisible sans onboarding.

## Product Purpose

mikconnect est une plateforme SaaS multi-tenant qui surcouche les routeurs
Mikrotik des propriétaires de zones WiFi en CI et en Guinée. Elle gère le
pairing routeur (API RouterOS + stockage chiffré des credentials), vend des
accès (tickets pushés en RADIUS via agents en cash, et achat direct mobile
money via Cinetpay), et pilote le revenu : dashboard temps réel, rapport
mensuel PDF, et reconciliation ventes ↔ usages pour détecter la fraude
agent. Elle existe parce que le natif Mikrotik est gratuit mais sans couche
cloud, mobile money, ni reconciliation ; que les SaaS mondiaux (Tanaza,
HotspotSystem) sont trop chers, trop complexes, non localisés ; et que les
solutions locales (Smart Hand) sont fermées ou géographiquement limitées.

Le succès à 6 mois : 200 tenants actifs, 20 000 tickets générés par mois,
40 % des tenants au palier payant, écart agent < 2 % pour 95 % des tenants,
NPS > 40, dashboard chargé en moins de 1,5 s sur 3G.

## Positioning

**Pilotez vos zones WiFi, vendez plus, gardez le contrôle.** Trois verbes,
trois piliers que chaque écran doit renforcer. _Piloter_ : visibilité du
revenu temps réel et multi-zones depuis un téléphone, pas depuis un routeur.
_Vendre plus_ : agents commissionnés et achat direct mobile money côté
client. _Garder le contrôle_ : reconciliation anti-fraude, résilience
offline (les tickets restent valides si le cloud tombe), rapport mensuel
qui rend chaque franc comptable.

## Brand Personality

**Fiable, Proche, Malin, Calme.**

- _Fiable_ : chiffres exacts, reconciliation sans écart, rien de cassé en
  offline. Le propriétaire ferme l'app en sachant où en est son business.
- _Proche_ : ancré CI/GN, mobile money local natif, FCFA et GNF via
  `Intl.NumberFormat`, français natif. Références visuelles familières
  (Orange Money, Wave), pas un SaaS US traduit.
- _Malin_ : aide à vendre plus et à détecter la fraude agent. Pas juste un
  outil de saisie — un angle d'attaque sur le revenu qui fuit.
- _Calme_ : pas d'alertes agressives, pas de FOMO, pas de dark mode "cool"
  par défaut. On gère son business sereinement. La fraude se lit dans des
  chiffres clairs, pas dans des notifications paniquées.

## Anti-references

- **AI slop SaaS 2026** : fond crème / sable / parchemin, police Inter,
  gradient text, eyebrow majuscule au-dessus de chaque section, grille de
  cards identiques icon + titre + texte. Le reflexe par défaut de tout
  générateur — exactement ce que mikconnect refuse.
- **Fintech glacée / néon** : glassmorphism décoratif, accents néon, dark
  mode "cool" par défaut, animations bounce / elastic. Esthétique qui
  impressionne en showcase mais fatigue sur le terrain.
- **Enterprise dense** : dashboards type Grafana / Zabbix, murs de
  métriques, toggles et filtres everywhere. Paralysant pour un propriétaire
  sur téléphone 3G qui veut juste savoir si ça tourne.

## Design Principles

1. **Le revenu d'abord.** Chaque écran met le revenu ou la santé de la zone
   en évidence avant tout. Le propriétaire ouvre l'app pour savoir si ça
   tourne, pas pour configurer.
2. **Marche sur 3G, sur téléphone, au soleil.** Performance et lisibilité
   passent avant la richesse fonctionnelle. Si un écran ne sert pas sur un
   Android d'entrée de gamme en 3G avec du soleil sur l'écran, il ne sert
   pas.
3. **Local n'est pas une traduction.** Mobile money CI/GN, FCFA / GNF via
   `Intl.NumberFormat`, français natif, références visuelles familières
   (Orange Money, Wave). Pas un SaaS US traduit en français.
4. **Construire la confiance, pas la pression.** Pas de FOMO, pas d'alertes
   agressives, pas de dark mode par défaut. Calme, exact, sobre. La fraude
   se détecte dans des chiffres clairs, pas dans des notifications
   paniquées.
5. **Pilote, pas mécano.** mikconnect surcouche Mikrotik sans exposer le
   jargon routeur. Le propriétaire configure une zone, pas un SSID ou un
   profil RADIUS. Le détail technique reste sous le capot.

## Accessibility & Inclusion

WCAG AA (PRD §9). Contexte d'usage spécifique : utilisateurs sur smartphone
d'entrée de gamme en 3G, souvent en extérieur avec fort ensoleillement —
donc contraste élevé obligatoire, et le gris muet "pour l'élégance" est
interdit sur le texte courant. `prefers-reduced-motion` respecté partout
(PRD §9 + skill Impeccable). Aucun statut (ticket, paiement, écart agent)
ne dépend de la couleur seule : une icône ou un libellé accompagne toujours.
i18n FR par défaut, structure EN / PT prête via `next-intl`. Montants
formatés selon la devise et la locale, jamais de "$" ni de virgule US.
