/**
 * Register — redesign split-screen
 * Gauche: formulaire · Droite: panneau vitré animé (gradient + blobs)
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import AnimatedButton from '../components/Motion/AnimatedButton';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function Register() {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', companyName: '', country: '' });
  const [error, setError] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success'>('idle');
  const { register } = useAuth();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitState('loading');
    try {
      await register(form);
      setSubmitState('success');
      await new Promise(r => setTimeout(r, 600));
      navigate('/dashboard');
    } catch (err: any) {
      setSubmitState('idle');
      setError(err.response?.data?.error || "Erreur d'inscription");
    }
  };

  const set = (key: keyof typeof form) => (v: string) => setForm(prev => ({ ...prev, [key]: v }));

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl flex rounded-2xl overflow-hidden shadow-2xl"
        style={{ boxShadow: 'var(--shadow-4)' }}>
        {/* ── Left: form ── */}
        <div className="flex-1 bg-white dark:bg-[var(--bg-secondary)] p-8 md:p-12 flex flex-col justify-center">
          <motion.div
            initial={reduce ? {} : { opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t('auth.register.title')}
            </h1>
            <p className="text-gray-500 mb-8">{t('auth.register.subtitle')}</p>

            {error && (
              <motion.div
                className="mb-6 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl"
                initial={reduce ? {} : { opacity: 0, x: -10 }}
                animate={reduce ? {} : { opacity: 1, x: 0 }}
              >
                <motion.span animate={reduce ? {} : { x: [0, -6, 6, -6, 6, 0] }} transition={{ duration: 0.4 }}>
                  {error}
                </motion.span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatedInput id="reg-name" label={t('auth.name')} type="text" value={form.name} onChange={set('name')} required />
                <AnimatedInput id="reg-email" label={t('auth.email')} type="email" value={form.email} onChange={set('email')} required />
                <AnimatedInput id="reg-phone" label={t('auth.phone')} type="tel" value={form.phone} onChange={set('phone')} />
                <AnimatedInput id="reg-company" label={t('auth.company')} type="text" value={form.companyName} onChange={set('companyName')} />
                <AnimatedInput id="reg-country" label={t('auth.country')} type="text" value={form.country} onChange={set('country')} />
                <AnimatedInput id="reg-password" label={t('auth.password')} type="password" value={form.password} onChange={set('password')} required minLength={6} />
              </div>
              <div className="pt-2">
                <AnimatedButton type="submit" variant="primary" state={submitState} className="w-full justify-center">
                  {t('auth.register.submit')}
                </AnimatedButton>
              </div>
              <p className="text-center text-sm text-gray-500">
                {t('auth.register.hasAccount')}{' '}
                <Link to="/login" className="text-primary-600 hover:underline font-medium">
                  {t('auth.register.login')}
                </Link>
              </p>
            </form>
          </motion.div>
        </div>

        {/* ── Right: glass panel ── */}
        <div className="hidden md:flex flex-1 relative bg-gradient-to-br from-primary-600 via-primary-700 to-cyan-600 overflow-hidden">
          <motion.div
            className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-cyan-400/20 blur-3xl"
            animate={reduce ? {} : { x: [0, 20, -10, 0], y: [0, -20, 10, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-20 -left-12 w-64 h-64 rounded-full bg-primary-400/25 blur-3xl"
            animate={reduce ? {} : { x: [0, -20, 15, 0], y: [0, 20, -10, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-white/5 backdrop-blur-sm"
            animate={reduce ? {} : { scale: [1, 1.1, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative z-10 flex flex-col justify-center p-12 text-white">
            <motion.div
              initial={reduce ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5, ease: EASE }}
            >
              <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                <span className="text-2xl font-bold">M</span>
              </div>
              <h2 className="text-2xl font-bold mb-3">Rejoignez MikConnect</h2>
              <p className="text-white/70 text-sm leading-relaxed max-w-xs">
                Accédez à une plateforme complète de gestion hotspot avec analytics en temps réel, vouchers personnalisables et billing intégré.
              </p>
            </motion.div>

            <motion.div
              className="mt-10 space-y-3"
              initial={reduce ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              {[
                'Déploiement en minutes',
                'Analytics temps réel',
                'Support 24/7',
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-2 text-white/80 text-sm">
                  <svg className="w-4 h-4 text-cyan-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feat}
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnimatedInput({
  id, label, type, value, onChange, required, minLength,
}: {
  id: string; label: string; type: string;
  value: string; onChange: (v: string) => void; required?: boolean; minLength?: number;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;

  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        minLength={minLength}
        className={`
          peer w-full px-4 pt-6 pb-2 rounded-xl border bg-white dark:bg-[var(--bg-primary)]
          text-gray-900 dark:text-white outline-none transition-all duration-200
          ${focused
            ? 'border-primary-500 ring-2 ring-primary-500/20'
            : 'border-[var(--border-color)] hover:border-gray-400 dark:hover:border-gray-600'
          }
        `}
      />
      <label
        htmlFor={id}
        className={`
          absolute left-4 transition-all duration-200 pointer-events-none
          ${focused || hasValue
            ? 'top-2 text-xs text-primary-500 font-medium'
            : 'top-1/2 -translate-y-1/2 text-sm text-gray-400'
          }
        `}
      >
        {label}
      </label>
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 bg-primary-500 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: focused ? '100%' : 0 }}
        transition={{ duration: 0.25, ease: EASE }}
      />
    </div>
  );
}