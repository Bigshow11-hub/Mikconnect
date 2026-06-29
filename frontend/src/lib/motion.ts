/**
 * MikConnect Motion System — Framer Motion variants & configs
 * Centralise toutes les animations pour éviter les valeurs magiques dispersées.
 * Use: import { easing, variants } from '@/lib/motion'
 */

/** Easing curves réutilisables */
export const easing = {
  /** cubic-bezier(0.16, 1, 0.3, 1) — courbe signature MikConnect */
  smooth: [0.16, 1, 0.3, 1] as [number, number, number, number],
  /** Spring standard pour interactions UI */
  spring: { stiffness: 300, damping: 30, mass: 0.8 },
  /** Motion de marque — entrées majeures (titres, cartes hero) */
  signature: { stiffness: 200, damping: 26 },
};

/** Transitions réutilisables */
export const transitions = {
  fast:      { duration: 0.15, ease: [0.16, 1, 0.3, 1] },
  base:      { duration: 0.3,  ease: [0.16, 1, 0.3, 1] },
  slow:      { duration: 0.6,  ease: [0.16, 1, 0.3, 1] },
  spring:    easing.spring,
  signature: easing.signature,
};

/** Variants réutilisables pour AnimatePresence */
export const variants = {
  /** Transitions de page (route enter/exit) */
  page: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: -8 },
  },

  /** Conteneur de stagger (appliquer sur le parent avec `staggerChildren`) */
  stagger: {
    animate: {
      transition: { staggerChildren: 0.06, delayChildren: 0.1 },
    },
  },

  /** Élément de liste/card avec entrée et exit collapse */
  listItem: {
    initial:   { opacity: 0, y: 16 },
    animate:  { opacity: 1, y: 0 },
    exit:     { opacity: 0, height: 0, marginBottom: 0 },
  },

  /** Carte avec hover/press */
  card: {
    initial:   { opacity: 0, y: 16 },
    animate:  { opacity: 1, y: 0 },
    hover:    { y: -4, transition: { ease: [0.16, 1, 0.3, 1], duration: 0.2 } },
  },

  /** Modal : backdrop fade + content scale */
  modal: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit:    { opacity: 0, scale: 0.96 },
  },

  /** Backdrop seul */
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit:    { opacity: 0 },
  },

  /** Toast slide-in from top + auto fade */
  toast: {
    initial:   { opacity: 0, y: -20 },
    animate:  { opacity: 1, y: 0 },
    exit:     { opacity: 0, y: -20 },
  },

  /** Fade simple entre onglets */
  fade: {
    initial:  { opacity: 0 },
    animate:  { opacity: 1 },
    exit:     { opacity: 0 },
  },
};