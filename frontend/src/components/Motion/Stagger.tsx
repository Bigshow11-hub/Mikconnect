/**
 * Stagger + StaggerItem — conteneur stagger pour listes
 * Usage:
 *   <Stagger>
 *     {items.map(i => <StaggerItem key={i.id}><Card>{i.name}</Card></StaggerItem>)}
 *   </Stagger>
 *
 * Le StaggerItem ajoute `variants.listItem` qui gère initial/animate/exit.
 */
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

interface StaggerProps {
  children: ReactNode;
  className?: string;
}

export function Stagger({ children, className }: StaggerProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      variants={{
        animate: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
      }}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={{
        initial:   { opacity: 0, y: 16 },
        animate:  { opacity: 1, y: 0 },
        exit:     { opacity: 0, height: 0, marginBottom: 0 },
      }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      layout
    >
      {children}
    </motion.div>
  );
}