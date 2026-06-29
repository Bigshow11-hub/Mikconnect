import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AnimatedButton from './Motion/AnimatedButton';

export default function Navbar() {
  const { t, locale, setLocale } = useI18n();
  const { isAuthenticated, user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled
        ? 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl shadow-sm border-b border-gray-200/50 dark:border-gray-800/50'
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center gap-2.5 group">
            <motion.div
              className="w-9 h-9 bg-gradient-to-br from-primary-600 to-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20"
              whileHover={{ scale: 1.05, boxShadow: '0 0 24px rgba(59,130,246,0.4)', transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
            >
              <span className="text-white font-bold text-sm">M</span>
            </motion.div>
            <span className="font-bold text-xl text-gray-900 dark:text-white">Mik<span className="text-primary-500">Connect</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link to="/" className="nav-link text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-gray-100/50 dark:hover:bg-white/[0.04] transition-all duration-200">{t('nav.home')}</Link>
            <Link to="/partners" className="nav-link text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-gray-100/50 dark:hover:bg-white/[0.04] transition-all duration-200">{t('nav.partners')}</Link>
            <Link to="/flash" className="nav-link text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-gray-100/50 dark:hover:bg-white/[0.04] transition-all duration-200">{t('nav.flash')}</Link>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')} className="w-9 h-9 rounded-xl hover:bg-gray-100/50 dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-400 text-xs font-semibold transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-700/50">{locale === 'fr' ? 'EN' : 'FR'}</button>
            <button onClick={toggle} className="w-9 h-9 rounded-xl hover:bg-gray-100/50 dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-400 flex items-center justify-center transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-700/50">
              {isDark ? (
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            {isAuthenticated ? (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-gray-800">
                <AnimatedButton variant="primary" className="text-sm !py-2 !px-4" onClick={() => navigate('/dashboard')}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  {t('nav.dashboard')}
                </AnimatedButton>
                <button onClick={() => { logout(); navigate('/'); }} className="btn-ghost text-sm py-2 px-3">{t('nav.logout')}</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-gray-800">
                <Link to="/login" className="btn-ghost text-sm py-2 px-4">{t('nav.login')}</Link>
                <AnimatedButton variant="primary" className="text-sm !py-2 !px-4" onClick={() => navigate('/register')}>
                  {t('nav.register')}
                </AnimatedButton>
              </div>
            )}
          </div>

          <button onClick={() => setOpen(!open)} className="md:hidden relative w-10 h-10 rounded-xl hover:bg-gray-100/50 dark:hover:bg-white/[0.04] flex items-center justify-center transition-all duration-200">
            <div className="w-5 h-4 relative flex flex-col justify-between">
              <span className={`block h-0.5 w-full bg-gray-600 dark:bg-gray-400 rounded-full transition-all duration-300 ${open ? 'rotate-45 translate-y-[7px]' : ''}`} />
              <span className={`block h-0.5 w-full bg-gray-600 dark:bg-gray-400 rounded-full transition-all duration-300 ${open ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-full bg-gray-600 dark:bg-gray-400 rounded-full transition-all duration-300 ${open ? '-rotate-45 -translate-y-[7px]' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed top-0 right-0 bottom-0 w-72 max-w-[85vw] bg-white dark:bg-gray-950 shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col animate-slide-up origin-top-right">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800">
              <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
                <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">M</span>
                </div>
                <span className="font-bold text-lg text-gray-900 dark:text-white">MikConnect</span>
              </Link>
            </div>
            <div className="flex-1 p-4 space-y-1 overflow-y-auto">
              <Link to="/" className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.04] text-gray-700 dark:text-gray-300 font-medium transition-all" onClick={() => setOpen(false)}>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                {t('nav.home')}
              </Link>
              <Link to="/partners" className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.04] text-gray-700 dark:text-gray-300 font-medium transition-all" onClick={() => setOpen(false)}>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {t('nav.partners')}
              </Link>
              <Link to="/flash" className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.04] text-gray-700 dark:text-gray-300 font-medium transition-all" onClick={() => setOpen(false)}>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                {t('nav.flash')}
              </Link>
              <div className="my-3 border-t border-gray-100 dark:border-gray-800" />
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-400 font-semibold transition-all" onClick={() => setOpen(false)}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    {t('nav.dashboard')}
                  </Link>
                  <button onClick={() => { logout(); navigate('/'); setOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 font-medium transition-all">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.04] text-gray-700 dark:text-gray-300 font-medium transition-all" onClick={() => setOpen(false)}>
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                    {t('nav.login')}
                  </Link>
                  <Link to="/register" className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-400 font-semibold transition-all" onClick={() => setOpen(false)}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                    {t('nav.register')}
                  </Link>
                </>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <button onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')} className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-white/[0.04] text-gray-600 dark:text-gray-400 text-xs font-semibold transition-all hover:bg-gray-200 dark:hover:bg-white/[0.08]">{locale === 'fr' ? 'Switch to English' : 'Passer en Français'}</button>
              <button onClick={toggle} className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/[0.04] text-gray-600 dark:text-gray-400 flex items-center justify-center transition-all hover:bg-gray-200 dark:hover:bg-white/[0.08]">
                {isDark ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}