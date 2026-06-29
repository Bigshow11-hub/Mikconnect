/**
 * AnimatedButton — bouton avec hover lift + tap scale + ripple au clic
 * Remplace progressivement les <button className="btn-primary"> etc.
 *
 * Variants: primary | secondary | ghost
 * États: idle | loading | success
 */
import { useState, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type State = 'idle' | 'loading' | 'success';

interface Props {
  variant?: Variant;
  state?: State;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'reset' | 'submit';
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-500/20 hover:shadow-lg hover:shadow-primary-500/30',
  secondary: 'bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 shadow-sm hover:shadow-md',
  ghost: 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400',
};

const EASE_SMOOTH: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function AnimatedButton({
  variant = 'primary',
  state = 'idle',
  children,
  className = '',
  disabled,
  onClick,
  type = 'button',
}: Props) {
  const reduce = useReducedMotion();
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (state !== 'idle' || disabled) return;

    if (!reduce && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now();
      setRipples(prev => [...prev, { x, y, id }]);
      setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
    }

    onClick?.(e);
  };

  const isDisabled = disabled || state === 'loading' || state === 'success';

  const whileHover = reduce || isDisabled
    ? {}
    : { y: -2, transition: { duration: 0.15, ease: EASE_SMOOTH } };

  const whileTap = reduce || isDisabled
    ? {}
    : { scale: 0.97, transition: { duration: 0.1, ease: EASE_SMOOTH } };

  return (
    <motion.button
      ref={btnRef}
      className={`
        relative overflow-hidden font-semibold py-2.5 px-6 rounded-xl
        transition-all duration-300 inline-flex items-center gap-2
        ${variantClasses[variant]}
        ${className}
      `}
      whileHover={whileHover}
      whileTap={whileTap}
      disabled={isDisabled}
      onClick={handleClick}
      type={type}
    >
      {/* Ripple effects */}
      {!reduce && ripples.map(r => (
        <motion.span
          key={r.id}
          className="absolute rounded-full bg-white/30 pointer-events-none"
          style={{ left: r.x, top: r.y, width: 1, height: 1 }}
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 200, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE_SMOOTH }}
        />
      ))}

      {/* State: loading spinner */}
      {state === 'loading' && (
        <motion.span
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* State: success check */}
      {state === 'success' && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 8l3.5 3.5L13 4.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {state === 'idle' && children}
      {state === 'loading' && <span>Chargement…</span>}
      {state === 'success' && <span>Succès</span>}
    </motion.button>
  );
}