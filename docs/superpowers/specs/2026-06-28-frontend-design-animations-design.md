# Frontend Design & Animations — Design Spec

**Date :** 2026-06-28
**Projet :** MikConnect (frontend React)
**Auteur :** brainstorming session
**Statut :** À valider

---

## 1. Objectif

Améliorer le design et ajouter des animations sur **tout le frontend** (Auth + Dashboard + site public) en :
- polissant l'identité visuelle existante (bleu/cyan, glassmorphism, thème sombre par défaut) ;
- ajoutant de **nouvelles** animations (transitions de route, skeletons de chargement, hover/press sur boutons, feedback de formulaires, success animations, delete-collapse…) ;
- garantissant un rendu **fluide (60 fps) et accessible** (`prefers-reduced-motion`).

## 2. Décisions clés (validées)

| Décision | Choix |
|----------|-------|
| Portée | Tout le frontend (Auth + Dashboard + site public) |
| Direction visuelle | Polir l'existant (bleu/cyan, glass, sombre) — pas de refonte stylistique |
| Amplitude | Auth = maximal · Dashboard layout/listes = élevé/modéré · Site public = léger · Micro-interactions = transverse |
| Technique | **Framer Motion partout** (route, listes, layout, gestes) |
| Qualité | Fluide 60fps + accessible (`prefers-reduced-motion`) |
| Redesign structurel | **Non** — on injecte le système d'animation dans les composants existants |

## 3. Architecture & fondations

### Dépendance
- Ajouter `framer-motion` au workspace `frontend/` (compatible React 18).

### Cœur du système : `frontend/src/lib/motion.ts`
Exporte toutes les *variants* et configs réutilisables (fini les valeurs magiques dispersées) :

```ts
export const easing = {
  smooth: [0.16, 1, 0.3, 1],      // cubic-bezier signature MikConnect
  spring: { stiffness: 300, damping: 30, mass: 0.8 },
  signature: { stiffness: 200, damping: 26 }, // motion de marque (entrées majeures)
};

export const variants = {
  page:        { initial:{opacity:0,y:12}, animate:{opacity:1,y:0}, exit:{opacity:0,y:-8} },
  card:        { /* stagger container parent */ },
  listItem:    { initial:{opacity:0,y:16}, animate:{opacity:1,y:0}, exit:{opacity:0,height:0} },
  modal:       { initial:{opacity:0,scale:0.96}, animate:{opacity:1,scale:1}, exit:{opacity:0,scale:0.96} },
  backdrop:    { initial:{opacity:0}, animate:{opacity:1}, exit:{opacity:0} },
  toast:       { /* slide-in from top + auto fade */ },
  tabContent:  { /* fade entre onglets */ },
};
```

### Tokens de design (CSS variables dans `index.css`)
**Timing & easing** :
- `--dur-fast: 150ms`, `--dur-base: 300ms`, `--dur-slow: 600ms`
- `--ease-smooth`, alias du cubic-bezier `[0.16, 1, 0.3, 1]`

**Échelle d'élévation** (remplace `shadow-card` / `shadow-card-hover` dispersés) :
- `--shadow-1` → `--shadow-4` (du repos au survol poussé)

**Rayons standardisés** :
- `--radius-sm: 0.75rem` · `--radius-md: 1rem` · `--radius-lg: 1.5rem`

**Lueur de marque** :
- `--accent-glow: 0 0 40px rgba(59,130,246,0.2)` — unifie les effets de glow sur hover.

### Accessibilité
- Hook `useReducedMotion()` de Framer Motion appliqué sur `PageTransition`, `Stagger`, `Modal` :
  - mode réduit → **opacity-only** (pas de translate/scale), durée ~0.1s, pas de ripple.
- Le `@media (prefers-reduced-motion: reduce)` existant dans `index.css` est conservé pour les animations CSS décoratives (blobs, anneaux).

### Performances
- Propriétés animées : `transform` et `opacity` uniquement (GPU-friendly, pas de reflow).
- `will-change` géré nativement par Framer (posé/retiré pendant l'animation).
- Stagger plafonné à ~8 items animés ; au-delà : fade simple (évite les cascades de timers).

## 4. Composants animés réutilisables (nouveaux fichiers)

```
frontend/src/components/Motion/
  PageTransition.tsx   ← wrapper de transition de route (AnimatePresence dans App.tsx + useLocation)
  Stagger.tsx          ← conteneur stagger (+ StaggerItem)
  AnimatedButton.tsx   ← composant React bouton : variants primary/secondary/ghost + ripple au clic
  Skeleton.tsx         ← variantes ligne / cercle / carte (shimmer)
```

**`AnimatedButton`** est un composant React utilisé dans le JSX (il reprend les styles des classes CSS `.btn-primary/.btn-secondary/.btn-ghost` déjà définies dans `index.css` comme base, et y ajoute `whileHover`/`whileTap`/ripple). On remplace progressivement les `<button className="btn-primary">` par `<AnimatedButton variant="primary">` au fil des pages touchées — pas de big-bang.

Les cartes existantes (`.card`, `.card-hover`) **gardent** leurs classes CSS ; on y ajoute du `motion` au cas par cas (ex. `motion.div` avec `whileHover`) dans les pages concernées. **Pas de composant `Card` dédié.**

`PageTransition`, `Stagger` et `Modal` consultent `useReducedMotion()` pour désactiver la cinématique.

## 5. Spécifications par surface

### 🌐 Site public (Home + Navbar)
- **Transitions de route** : chaque page entre/sort en `fade + slide-up` (0.3s).
- **Navbar** : logo « M » en `whileHover` (scale + glow), liens avec **underline animé** (scaleX gauche→droite).
- **Hero** : typing conservé ; titre/sous-titre passent en **stagger** Framer (remplace les `animationDelay` CSS dispersés). Blobs et anneaux gardent leur CSS (déjà performants).
- **Cartes** (features/témoignages/tarifs) : `whileHover` lift + ombre + lueur gradient (mouvement spring).
- **FAQ** : ouverture via `AnimatePresence` + `height: auto` (remplace le `max-h-48` rigide actuel).

### 🔐 Pages Auth (Login/Register) — *gain maximal*
Actuellement cartes plates → **redesign split-screen** :
- Panneau gauche = formulaire (zone focalisée) ; panneau droit = **panneau vitré animé** (gradient bleu/cyan, blobs flottants, logo, citation/témoignage rotatif). S'adapte en mobile (masqué ou réduit).
- **Champs** : label flottant, bordure qui se remplit de gauche à droite au focus, icône ✓ en spring après vérification de format.
- **Bouton submit** : `whileHover` lift, `whileTap` scale 0.97, état **loading** (spinner + texte « Connexion… »), état **success** (checkmark dessiné via path drawing) avant redirection.
- **Erreur** : shake horizontal (2 oscillations) sur le formulaire, message slide-in.

### 📊 Dashboard (Layout + pages internes)
- **Sidebar** : **indicateur actif animé** via `layoutId` (barre lumineuse qui se déplace entre items) remplaçant le point pulsé statique.
- **Sortie/entrée de page** via `PageTransition`.
- **Overview** : compteurs animés (spring), **skeletons** pendant le fetch (`/users/stats`, `/vouchers`) au lieu du `0` qui saute.
- **Pages de listes** (Hotspots, Plans, Vouchers, Transactions, Resellers, Partners, Roaming, Users) :
  - **Skeleton** pendant le fetch (cartes / skeleton-table grisés + shimmer).
  - **Stagger** à l'entrée des lignes/cartes.
  - **Suppression** : ligne qui se collapse en hauteur (`AnimatePresence`) au lieu de disparaître net.
  - **Création** : nouvelle ligne qui apparaît (scale + slide).
  - **Hover** lignes : lift léger + chevron qui slide.
- **Tables** : en-tête sticky (subtle fade), pagination avec transition entre pages.
- **Toasts** : migrés vers variant Framer (slide-in from top + auto fade).
- **Modal** (`Modal.tsx`) : `AnimatePresence` backdrop fade + content scale/slide-up, sortie propre.

### ✨ Micro-interactions transverses
- **Boutons** (`btn-primary/secondary/ghost`) : `whileHover` lift + ombre, `whileTap` scale 0.97, **ripple** (cercle qui s'étend depuis le point de clic).
- **Badges de statut** : pulse subtil sur `ACTIVE`, fade-in à l'apparition.
- **Skeletons** (`<Skeleton>` : ligne / cercle / carte) avec shimmer synchronisé.

## 6. Thématique visuelle / cohérence de marque

- **Palette** : conserver `primary-600` + accent cyan. Ajouter `--accent-glow` pour unifier les lueurs de hover (aujourd'hui chaque composant invente son opacité).
- **Ombres** : échelle `--shadow-1` à `--shadow-4` (remplace `shadow-card`/`shadow-card-hover`).
- **Border radius** : 3 rayons standardisés (`--radius-sm/md/lg`).
- **Mouvement de marque** : « MikConnect signature motion » = slide-up + fade en spring doux (`stiffness: 200, damping: 26`), utilisé pour toutes les entrées majeures (titres de page, cartes hero).

## 7. Tests & validation

- **Pas de tests unitaires sur les animations elles-mêmes** (non déterministes). À la place :
  - Composants animés rendent **sans crasher** dans différents états (idle, loading, success, error).
  - `AnimatedButton` : `onClick` se déclenche (le ripple ne bloque pas le clic) ; `disabled` reste désactivé.
  - `PageTransition` : avec `useReducedMotion === true`, le contenu reste visible (pas bloqué à `opacity: 0`).
  - `Skeleton` : rend le bon nombre d'éléments selon les props.
  - Mise à jour des tests existants impactés (`login.test.tsx`, `register.test.tsx`, `dashboard-layout.test.tsx`).
- **Build de prod** : `npm run build -w frontend` (= `tsc -b && vite build`) passe sans erreur TS.

## 8. Plan de découpage (6 phases cumulatives)

| # | Phase | Contenu | Effort |
|---|-------|---------|--------|
| 1 | Fondations | `framer-motion`, `lib/motion.ts`, tokens CSS, wrappers `Motion/` | ~1 session |
| 2 | Routes + boutons | `AnimatePresence` dans `App.tsx`, `Modal` Framer, `AnimatedButton` global | ~1 session |
| 3 | Auth | Redesign split-screen Login/Register | ~1.5 session |
| 4 | Dashboard layout + overview | Sidebar `layoutId`, skeletons overview, Counter spring | ~1 session |
| 5 | Pages de listes | Stagger/skeleton/hover/delete-collapse sur les 8 pages | ~1.5 session |
| 6 | Site public + tests + build | Navbar, Home, mise à jour tests, vérif reduced-motion, build prod | ~1 session |

### Risques & mitigation
- **Régressions de tests** → Phase 6 dédiée à la mise à jour.
- **Bundle size** (`framer-motion` ~50 ko gzip) → acceptable, tree-shaken, compensé par la valeur.
- **`AnimatePresence` mal configuré** → tester le route transition tôt (Phase 2).

## 9. Hors périmètre (YAGNI)

- ❌ Drag-and-drop
- ❌ Parallax souris
- ❌ Canvas / WebGL
- ❌ Redesign structurel des pages dashboard existantes
- ❌ Widget de paiement / captive-portal (backend)
