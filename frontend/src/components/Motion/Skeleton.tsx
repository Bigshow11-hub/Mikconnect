/**
 * Skeleton — loader placeholder avec effet shimmer
 * Variantes: line | circle | card
 * Usage: <Skeleton variant="card" />
 */
import { useReducedMotion } from 'framer-motion';
import { motion } from 'framer-motion';

interface Props {
  variant?: 'line' | 'circle' | 'card';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export default function Skeleton({
  variant = 'line',
  width,
  height,
  className = '',
}: Props) {
  const reduce = useReducedMotion();

  const baseClass = 'rounded-lg bg-gray-200 dark:bg-white/5';

  const style: React.CSSProperties = {
    width:  width  ?? (variant === 'circle' ? 40 : '100%'),
    height: height ?? (variant === 'line' ? 16 : variant === 'circle' ? 40 : 120),
  };

  if (reduce) {
    return <div className={`${baseClass} ${className}`} style={style} />;
  }

  return (
    <motion.div
      className={`${baseClass} ${className}`}
      style={style}
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}