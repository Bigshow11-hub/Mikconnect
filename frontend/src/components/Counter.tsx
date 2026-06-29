/**
 * Counter — animation de compteur avec Framer Motion
 * Version simple : spring animation sur un span.
 */
import { useEffect, useRef } from 'react';
import { motion, useSpring, useMotionValue, useTransform, useReducedMotion } from 'framer-motion';

interface CounterProps {
  end: number;
  className?: string;
}

export default function Counter({ end, className }: CounterProps) {
  const reduce = useReducedMotion();
  const count = useMotionValue(0);
  const springCount = useSpring(count, { stiffness: 60, damping: 18, mass: 0.8 });
  const displayRef = useRef<HTMLSpanElement>(null);

  // Sync motion value → DOM without triggering re-renders
  useEffect(() => {
    const unsubscribe = springCount.on('change', (v) => {
      if (displayRef.current) {
        displayRef.current.textContent = Math.floor(v).toLocaleString();
      }
    });
    return () => unsubscribe();
  }, [springCount]);

  useEffect(() => {
    if (reduce) {
      if (displayRef.current) displayRef.current.textContent = end.toLocaleString();
      return;
    }
    count.set(end);
  }, [end, reduce, count]);

  return (
    <motion.span ref={displayRef}>
      {reduce ? end.toLocaleString() : '0'}
    </motion.span>
  );
}