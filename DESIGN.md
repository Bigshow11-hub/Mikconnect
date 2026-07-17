<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->

---

name: mikconnect
description: Le copilote mobile du propriétaire de zone WiFi — billing, agents, mobile money, reconciliation.
---

# Design System: mikconnect

## 1. Overview

**Creative North Star: "The Network Ledger"**

mikconnect est le grand livre du quartier : un registre sobre, réglé,
numérique, tenu à la main par le propriétaire de zone WiFi depuis son
téléphone, au soleil, en 3G. Le _quartier_ porte la chaleur humaine —
bleu signal, mobile money, FCFA/GNF, français natif. Le _ledger_
porte l'exactitude — chiffres alignés en mono, hiérarchie nette, fond
blanc pur, aucune décoration qui ne sert pas un franc compté.

Le système est **Restreint** par défaut : neutres teintés + un accent
bleu cobalt qui ne couvre jamais plus de 10 % d'un écran. La proximité de la
marque vit dans la couleur primaire et la typo, jamais dans la surface —
le fond reste blanc pur, lisible en plein soleil sur un Android d'entrée
de gamme. C'est le pattern Stripe / Sumup / Wise : la marque parle, le
surface se tait.

Le motion est **Responsive** : feedback immédiat sur les actions (vendre
un ticket, confirmer un paiement, pousser un batch), transitions de page
discrètes, aucune chorégraphie. Les courbes sont ease-out exponentielles
(quart / quint / expo), jamais bounce ni elastic. `prefers-reduced-motion`
remplace toute transition par un crossfade ou un changement instantané.

Ce système refuse explicitement : le fond crème / sable / parchemin du
SaaS AI 2026, la police Inter, le gradient text, l'eyebrow majuscule
kicker au-dessus de chaque section, la grille de cards identiques, le
glassmorphism décoratif, le néon, le dark mode "cool" par défaut, les
animations bounce / elastic, et le dashboard enterprise dense type
Grafana / Zabbix qui paralyse un propriétaire sur téléphone.

**Key Characteristics:**

- Restreint : un accent cobalt ≤10 %, neutres bleu-encre, fond blanc pur.
- Mobile-first 3G : lisibilité soleil, touch targets généreux, performances avant richesse.
- Ledger numérique : mono pour montants et codes tickets, hiérarchie typographique nette.
- Chaleur locale dans la marque, jamais dans la surface.
- Calme : pas de FOMO, pas d'alertes agressives, motion responsive seulement.

## 2. Colors

**The Restrained Rule.** Un seul accent (cobalt) sur ≤10 % de tout
écran. Sa rareté est le point. Le fond reste blanc pur ; la chaleur vit
dans la primaire et la typo, pas dans la surface.

### Primary

- **Cobalt signal** (`oklch(0.53 0.18 258)`) : la couleur
  de marque. CTA primaires, montants clés en hero, marque, liens actifs.
  Texte blanc sur les fills (L 0.42–0.78 + chroma ≥ 0.08 → blanc forcé).

### Secondary

- **Teal profond calme** (`[to be resolved during implementation]`,
  hue ~160°, L ~0.59, chroma ~0.11) : le vert réseau, contrepoint du cobalt.
  Liens secondaires, accent rules, badges de statut actif, état focus.
  Texte blanc sur fills. Distinct du primaire en hue ET en luminance.

### Neutral

- **Blanc pur** (`oklch(1.000 0.000 0)`) : fond architectural par défaut.
  Lisible en soleil, jamais cream / sable / parchemin.
- **Blanc chaud subtil** (`[to be resolved]`, L ~0.985, chroma ~0.004,
  hue 31°) : surface des cards / panels. Tinte à peine vers la marque —
  pas du cream (L trop haut, chroma trop bas pour le band AI).
- **Encre noire-chaude** (`[to be resolved]`, L ~0.30, chroma ~0.018,
  hue 31°) : texte courant. Contraste ≥7:1 vs blanc pur pour le soleil.
- **Gris chaud muet** (`[to be resolved]`, encre tirée 40 % vers le bg,
  hue 31°) : texte secondaire, libellés, métadonnées. Contraste ≥3.5:1.

### Named Rules

**The Sunlight Rule.** Tout texte courant doit viser ≥7:1 de contraste
contre le fond, pas le 4.5:1 WCAG minimum. Le propriétaire lit dehors, au
soleil, sur un écran d'entrée de gamme. Le gris muet "pour l'élégance" est
interdit sur le body — si le contraste est proche, pousser vers l'encre.

**The No-Cream Rule.** Le fond ne entre jamais dans le band OKLCH
L 0.84–0.97, chroma < 0.06, hue 40–100 (crème / sable / parchemin /
lin / papier). La chaleur de la marque est portée par la primaire
cobalt et la typo humaniste, jamais par la surface. Si une surface
chaude est nécessaire, rester au-dessus de L 0.97 et sous chroma 0.008.

### Mode sombre volontaire

Le clair reste le thème par défaut pour la lecture en extérieur. Le mode
sombre est un choix explicite de l'utilisateur pour la gestion nocturne ou
en intérieur ; il est mémorisé sur l'appareil et appliqué avant le premier
affichage pour éviter un flash clair.

- **Charbon chaud, jamais noir pur.** Le canvas et les surfaces gardent une
  légère teinte à 31° ; pas de bleu nuit, de néon ni de glassmorphism.
- **Hiérarchie par luminance.** Les niveaux `canvas`, `bg`, `surface`,
  `surface-2` et `surface-3` remplacent les ombres décoratives.
- **Accent retenu.** Le cobalt est éclairci juste assez pour rester
  accessible, sans dépasser la règle des 10 % de surface.
- **Surfaces inversées stables.** Les panneaux comptables utilisent les
  tokens `inverse` et `inverse-foreground`, afin de rester volontairement
  profonds dans les deux thèmes.

## 3. Typography

**Display Font:** `Manrope Variable` — sans humaniste précise et compacte.
**Body Font:** `Manrope Variable` — plusieurs poids pour toute l’interface.
**Mono Font:** `JetBrains Mono Variable` — montants FCFA/GNF et codes tickets.

**Character:** Une sans humaniste qui parle français d'Abidjan et de
Conakry, pas le sans SaaS US de défaut. Chaleureuse sans être
décorative. Le mono donne aux chiffres l'autorité d'un grand livre —
montants alignés, codes tickets scannables en un coup d'œil.

### Hierarchy

- **Display** (poids ~600, `clamp(2rem, 5vw, 3rem)`, line-height ~1.1) :
  revenu du jour / mois en hero dashboard. Un seul par écran.
- **Headline** (poids ~600, ~1.5rem, line-height ~1.2) : titres de section
  / page. `text-wrap: balance`.
- **Title** (poids ~600, ~1.125rem, line-height ~1.3) : titres de cards,
  libellés de tableau.
- **Body** (poids ~400, ~1rem, line-height ~1.5, max 65–75ch) : texte
  courant, descriptions, copie d'onboarding.
- **Label** (poids ~500, ~0.8125rem, letter-spacing ~0, casse naturelle
  pas uppercase tracked) : libellés de formulaire, tags, métadonnées.
  Pas d'eyebrow majuscule kicker (anti-ref absolu).
- **Mono Amount** (poids ~500, ~1.125rem, mono) : montants FCFA / GNF en
  hero et tableaux. Alignement tabulaire.
- **Mono Code** (poids ~500, ~0.9375rem, mono, letter-spacing ~0.05em) :
  codes tickets alphanumériques. Scannable, sélectionnable.

### Named Rules

**The Ledger Rule.** Tout montant monétaire et tout code ticket est en
mono tabulaire. Les chiffres s'alignent en colonne, les codes se
scannent. Le sans humaniste est pour le langage humain, le mono est pour
les nombres de la compta.

**The No-Eyebrow Rule.** Pas de petit kicker majuscule tracked au-dessus
des titres de section ("À PROPOS", "PROCESSUS", "PALIERS"). Un kicker
nommé deliberate est voix ; un eyebrow au-dessus de chaque section est
grammaire AI. Choisir une cadence différente.

## 4. Elevation

Flat par défaut. La profondeur se lit par hiérarchie typographique et
bordures tonales, pas par ombres portées. Une ombre subtile n'apparaît
qu'en réponse à un état (hover sur une ligne de tableau cliquable, focus
sur un input, une modale ouverte) — jamais au repos. Les cards sont des
surfaces à bordure tonale, pas des objets flottants.

### Shadow Vocabulary `[to be resolved during implementation]`

- **focus-ring** : anneau de focus cobalt translucide sur inputs et
  boutons, jamais un box-shadow flou.
- **modal-lift** : ombre douce et basse sous modale / sheet, un seul
  niveau.
- **table-row-hover** : transition de fond vers blanc chaud subtil, pas
  d'ombre.

### Named Rules

**The Flat-By-Default Rule.** Les surfaces sont plates au repos. Une
ombre n'apparaît qu'en réponse à un état (hover, focus, élévation
modale). Pas de card flottante "pour la profondeur".

## 5. Components

`[Omis en mode seed. Les composants de base (Button, Input, Card, Badge,
Table, Toast, Modal, StatCard, TicketCard) seront spécifiés au prochain
passage /impeccable document une fois les tokens réels câblés dans
packages/ui.]`

## 6. Do's and Don'ts

### Do:

- **Do** utiliser le blanc pur (`oklch(1.000 0.000 0)`) comme fond
  architectural par défaut — lisible en soleil, anti-AI-slop.
- **Do** viser ≥7:1 de contraste pour le texte courant contre le fond
  (The Sunlight Rule) — au-dessus du 4.5:1 WCAG minimum.
- **Do** mettre montants et codes tickets en mono tabulaire (The Ledger
  Rule) — les chiffres s'alignent, les codes se scannent.
- **Do** garder l'accent cobalt sur ≤10 % de tout écran (The
  Restrained Rule).
- **Do** formatter montants via `Intl.NumberFormat` en XOF / GNF selon
  la locale du tenant.
- **Do** accompagner chaque statut (ticket, paiement, écart) d'une icône
  ou d'un libellé, jamais de la couleur seule.
- **Do** respecter `prefers-reduced-motion` partout : crossfade ou
  instant quand l'utilisateur lève la préférence.

### Don't:

- **Don't** utiliser un fond crème / sable / parchemin / lin / papier
  (The No-Cream Rule) — c'est le band saturé AI 2026, anti-ref explicite
  de PRODUCT.md.
- **Don't** utiliser la police Inter (anti-ref PLAN.md).
- **Don't** faire du gradient text (`background-clip: text` + gradient
  background) — décoratif, jamais signifiant.
- **Don't** poser un eyebrow majuscule tracked au-dessus de chaque
  section (The No-Eyebrow Rule) — grammaire AI par défaut.
- **Don't** répéter une grille de cards identiques icon + titre + texte —
  le reflexe AI-slop.
- **Don't** faire du glassmorphism décoratif, du néon, ou du dark mode
  "cool" par défaut (anti-ref "Fintech glacée / néon").
- **Don't** utiliser bounce / elastic dans le motion — ease-out
  exponentiel seulement (quart / quint / expo).
- **Don't** faire un dashboard enterprise dense type Grafana / Zabbix
  (anti-ref "Enterprise dense") — le propriétaire veut savoir si ça
  tourne, pas configurer des panels.
- **Don't** animer des propriétés de layout (`width`, `height`, padding)
  — transformer / opacity seulement.
- **Don't** utiliser un `border-left` > 1px comme stripe couleur
  d'accent sur cards / listes / alertes — anti-pattern absolu du skill.
- **Don't** empiler des cards dans des cards — toujours faux.
