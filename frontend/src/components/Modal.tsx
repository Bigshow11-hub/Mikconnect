/**
 * Modal — dialog animé avec AnimatePresence
 * Backdrop fade + content scale/slide-up.
 * Respecte prefers-reduced-motion.
 */
import { type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import AnimatedButton from './Motion/AnimatedButton';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: ReactNode;
  confirmText?: string;
  confirmClass?: string;
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function Modal({ open, onClose, onConfirm, title, children, confirmText = 'Confirmer', confirmClass = 'btn-primary' }: ModalProps) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.01 : 0.2 }}
          />

          {/* Content */}
          <motion.div
            className="relative bg-white dark:bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: reduce ? 0.01 : 0.25, ease: EASE }}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-6">{children}</div>
            <div className="flex justify-end gap-3">
              <AnimatedButton variant="secondary" onClick={onClose}>
                Annuler
              </AnimatedButton>
              <AnimatedButton
                variant="primary"
                onClick={() => { onConfirm(); onClose(); }}
                className={confirmClass}
              >
                {confirmText}
              </AnimatedButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}