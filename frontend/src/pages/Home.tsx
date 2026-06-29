import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { useReveal } from '../lib/useReveal';

const features = [
  { icon: '📡', title: 'Gestion Hotspot & PPPoE', desc: 'Provisionnement automatisé via API MikroTik RouterOS. Gérez plusieurs hotspots depuis un seul tableau de bord.', gradient: 'from-blue-500 to-cyan-500' },
  { icon: '💳', title: 'Vente Automatisée', desc: 'Paiements mobile money (MTN, Moov, Wave, Orange Money). Génération automatique de codes après paiement.', gradient: 'from-emerald-500 to-teal-500' },
  { icon: '🌐', title: 'Portail Captif Personnalisé', desc: 'Pages de connexion à votre image avec intégration paiement en ligne. Configuration en 30 secondes.', gradient: 'from-violet-500 to-purple-500' },
  { icon: '📊', title: 'Conformité & Traçabilité', desc: 'Identification complète des utilisateurs. Logs de connexion et rapports conformes aux régulateurs télécoms.', gradient: 'from-amber-500 to-orange-500' },
  { icon: '🔄', title: 'Roaming Entre Hotspots', desc: 'Un seul code fonctionne sur tous les WiFi zones participants. Revenue sharing automatique.', gradient: 'from-rose-500 to-pink-500' },
  { icon: '💼', title: 'Gestion Commerciale', desc: 'Système de revendeurs multi-niveaux. Suivi des investissements et statistiques en temps réel.', gradient: 'from-indigo-500 to-blue-500' },
];

const plans = [
  { name: 'Mensuel', price: '2 500', currency: 'XOF', period: '/mois', desc: 'Par routeur WiFi Zone. Gestion complète, support prioritaire, mises à jour incluses.', popular: false },
  { name: 'Annuel', price: '25 000', currency: 'XOF', period: '/an', desc: 'Économisez 5 000 XOF par an. Toutes les fonctionnalités + support dédié 24/7.', popular: true },
];

const typingTexts = ['WiFi Zone', 'Hotspot', 'Réseau', 'Business'];

function RevealBox({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal(0.1);
  return (
    <div ref={ref} className={`reveal ${visible ? 'visible' : ''} ${className}`} style={{ transitionDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

function StatBox({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const { ref, visible } = useReveal(0.1);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let current = 0;
    const step = Math.ceil(value / 40);
    const timer = setInterval(() => {
      current += step;
      if (current >= value) { current = value; clearInterval(timer); }
      setCount(current);
    }, 30);
    return () => clearInterval(timer);
  }, [visible, value]);
  return (
    <div ref={ref} className={`text-center ${visible ? 'animate-fade-in' : 'opacity-0'}`}>
      <div className="text-3xl md:text-4xl font-bold gradient-text-simple">{count}{suffix}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </div>
  );
}

const testimonials = [
  { name: 'Amadou Diallo', role: 'Gérant, WiFi Pro SARL', quote: 'MikConnect a révolutionné notre gestion. Les revenus ont augmenté de 40% dès le premier mois. Le roaming entre hotspots est un vrai plus pour nos clients.', avatar: 'AD', color: 'from-blue-500 to-cyan-500' },
  { name: 'Fatima Ouedraogo', role: 'CEO, NetAccess Burkina', quote: 'La génération automatique de codes après paiement mobile money nous a fait gagner un temps considérable. Plus besoin de saisie manuelle !', avatar: 'FO', color: 'from-emerald-500 to-teal-500' },
  { name: 'Koffi Mensah', role: 'Directeur Technique, Togo WiFi', quote: 'Le portail captif personnalisable et la conformité réglementaire intégrée nous ont permis de nous lancer en toute sérénité.', avatar: 'KM', color: 'from-violet-500 to-purple-500' },
];

const faqItems = [
  { q: 'Comment fonctionne l\'intégration MikroTik ?', a: 'MikConnect se connecte automatiquement à vos routeurs MikroTik via API RouterOS. Ajoutez simplement l\'IP et les identifiants de votre routeur, et nous configurons le hotspot, les profils, et le portail captif.' },
  { q: 'Quels moyens de paiement sont supportés ?', a: 'Nous supportons MTN Mobile Money, Moov Money, Wave, Orange Money, et Free Money. FedaPay est également intégré pour les paiements par carte bancaire.' },
  { q: 'Puis-je essayer avant de m\'abonner ?', a: 'Oui ! Créez un compte gratuit et testez la plateforme pendant 14 jours sans engagement. Vous aurez accès à toutes les fonctionnalités.' },
  { q: 'Comment fonctionne le système de revendeurs ?', a: 'Vous pouvez créer des revendeurs avec des commissions personnalisées (5%, 10%, etc.). Chaque revendeur reçoit ses propres codes de connexion et peut vendre des tickets WiFi avec sa marge.' },
  { q: 'Le roaming est-il automatique ?', a: 'Oui, un code WiFi généré sur n\'importe quel hotspot MikConnect fonctionne sur tous les hotspots participants. Le revenue sharing est calculé et versé automatiquement chaque mois.' },
  { q: 'Quel support technique est proposé ?', a: 'Nous offrons un support technique par WhatsApp, email, et téléphone. Les abonnés annuels bénéficient d\'un support prioritaire 24h/24 et 7j/7.' },
];

export default function Home() {
  const { t } = useI18n();
  const [typingIndex, setTypingIndex] = useState(0);
  const [typingText, setTypingText] = useState('');
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const current = typingTexts[typingIndex];
    let timeout: ReturnType<typeof setTimeout>;
    if (!deleting) {
      if (charIndex < current.length) {
        timeout = setTimeout(() => { setTypingText(current.slice(0, charIndex + 1)); setCharIndex(charIndex + 1); }, 80);
      } else {
        timeout = setTimeout(() => setDeleting(true), 2000);
      }
    } else {
      if (charIndex > 0) {
        timeout = setTimeout(() => { setTypingText(current.slice(0, charIndex - 1)); setCharIndex(charIndex - 1); }, 40);
      } else {
        setDeleting(false);
        setTypingIndex((typingIndex + 1) % typingTexts.length);
      }
    }
    return () => clearTimeout(timeout);
  }, [charIndex, deleting, typingIndex]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/[0.08] via-accent-600/[0.04] to-primary-600/[0.08] dark:from-primary-600/20 dark:via-accent-600/10 dark:to-primary-600/20 animate-gradient" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/10 dark:bg-primary-500/20 rounded-full blur-3xl animate-blobPulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/10 dark:bg-accent-500/20 rounded-full blur-3xl animate-blobPulse" style={{ animationDelay: '3s' }} />
        <div className="absolute top-40 right-40 w-48 h-48 bg-violet-500/10 dark:bg-violet-500/20 rounded-full blur-3xl animate-blobPulse" style={{ animationDelay: '6s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-primary-500/10 dark:border-primary-500/20 rounded-full animate-spin-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-accent-500/10 dark:border-accent-500/20 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '20s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-violet-500/10 dark:border-violet-500/20 rounded-full animate-spin-slow" style={{ animationDuration: '25s' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-400 text-sm font-medium mb-8 animate-fade-in shadow-sm border border-primary-200/50 dark:border-primary-800/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500" />
              </span>
              {t('home.badge')}
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white leading-[1.1] mb-6 animate-fade-in" style={{ animationDelay: '0.15s' }}>
              {t('home.hero.titlePrefix')}{' '}
              <span className="bg-gradient-to-r from-primary-500 via-primary-600 to-accent-500 bg-clip-text text-transparent inline-block">
                {typingText}<span className="inline-block w-[3px] h-[1em] bg-primary-500 ml-0.5 animate-pulse align-middle" />
              </span>{' '}
              {t('home.hero.titleSuffix')}
            </h1>
            <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 mb-10 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.3s' }}>
              MikConnect automatise entièrement la gestion de votre business internet : des paiements mobile money à l'accès WiFi,
              de la conformité réglementaire aux statistiques en temps réel.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.45s' }}>
              <Link to="/register" className="btn-primary text-lg px-8 py-3.5 shadow-xl shadow-primary-500/20 hover:shadow-2xl hover:shadow-primary-500/30">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                {t('home.hero.ctaStart')}
              </Link>
              <Link to="#features" className="btn-secondary text-lg px-8 py-3.5">{t('home.hero.learnMore')}</Link>
            </div>
            <p className="text-sm text-gray-400 mt-5 animate-fade-in" style={{ animationDelay: '0.6s' }}>{t('home.hero.trialNote')}</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 -mt-12 relative">
        <div className="page-container">
          <div className="glass-card p-8 md:p-10 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <StatBox value={500} label="Hotspots actifs" suffix="+" />
            <StatBox value={50} label="Revendeurs" suffix="+" />
            <StatBox value={10000} label="Tickets générés" suffix="+" />
            <StatBox value={98} label="Satisfaction" suffix="%" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="page-container">
          <RevealBox>
            <div className="text-center mb-16">
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary-600 dark:text-primary-400 mb-3">Fonctionnalités</span>
              <h2 className="section-title mb-4">{t('home.features.title')}</h2>
              <p className="section-subtitle mx-auto">Une plateforme complète pour gérer, vendre et développer votre activité internet.</p>
            </div>
          </RevealBox>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <RevealBox key={i} delay={i * 0.08}>
                <div className="card-hover group relative overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 rounded-2xl`} />
                  <div className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-300 inline-block">{f.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t(`home.features.item${i+1}.title`)}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </RevealBox>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-gray-50/50 dark:bg-gray-900/30">
        <div className="page-container">
          <RevealBox>
            <div className="text-center mb-16">
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary-600 dark:text-primary-400 mb-3">Comment ça marche</span>
              <h2 className="section-title mb-4">Commencez en 3 étapes</h2>
              <p className="section-subtitle mx-auto">Lancez votre business WiFi en quelques minutes.</p>
            </div>
          </RevealBox>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Créez votre compte', desc: 'Inscrivez-vous gratuitement et accédez à votre tableau de bord en quelques clics.', color: 'from-blue-500 to-cyan-500' },
              { step: '02', title: 'Ajoutez votre hotspot', desc: 'Connectez votre routeur MikroTik en un clic ou ajoutez-le manuellement via son IP.', color: 'from-emerald-500 to-teal-500' },
              { step: '03', title: 'Générez des revenus', desc: 'Créez vos offres, générez des tickets, et commencez à vendre du WiFi immédiatement.', color: 'from-violet-500 to-purple-500' },
            ].map((item, i) => (
              <RevealBox key={i} delay={i * 0.15}>
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} shadow-lg mb-5 text-white text-2xl font-bold`}>{item.step}</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                </div>
              </RevealBox>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="page-container">
          <RevealBox>
            <div className="text-center mb-16">
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary-600 dark:text-primary-400 mb-3">Témoignages</span>
              <h2 className="section-title mb-4">Ils nous font confiance</h2>
              <p className="section-subtitle mx-auto">Découvrez ce que nos partenaires disent de MikConnect.</p>
            </div>
          </RevealBox>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((item, i) => (
              <RevealBox key={i} delay={i * 0.12}>
                <div className="card-hover relative">
                  <svg className="absolute top-4 right-4 w-8 h-8 text-gray-200 dark:text-gray-800" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white text-sm font-bold shadow-sm`}>{item.avatar}</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.role}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">"{item.quote}"</p>
                </div>
              </RevealBox>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <RevealBox>
        <section className="py-24 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="page-container">
            <RevealBox>
              <div className="text-center mb-16">
                <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary-600 dark:text-primary-400 mb-3">Tarifs</span>
                <h2 className="section-title mb-4">{t('home.pricing.title')}</h2>
                <p className="section-subtitle mx-auto">{t('home.pricing.subtitle')}</p>
              </div>
            </RevealBox>
            <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
              {plans.map((plan, idx) => (
                <div key={plan.name} className={`card-hover relative ${plan.popular ? 'ring-2 ring-primary-500 shadow-xl shadow-primary-500/10 scale-[1.02]' : ''}`}>
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary-600 to-primary-500 text-white text-xs font-semibold px-5 py-1.5 rounded-full shadow-lg shadow-primary-500/20">{t('home.pricing.popular')}</span>
                  )}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t(`home.pricing.plan${idx+1}.name`)}</h3>
                  <div className="mb-4">
                    <span className="text-5xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                    <span className="text-gray-400 ml-1.5">{plan.currency}<span className="text-sm">{plan.period}</span></span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{plan.desc}</p>
                  <ul className="space-y-2.5 mb-6">
                    {['Gestion hotspots illimités', 'Portail captif personnalisé', 'Paiements mobile money', 'Support technique', 'Mises à jour incluses', ...(plan.popular ? ['Support prioritaire 24/7', 'Roaming gratuit', 'Revendeurs illimités'] : [])].map((feature, i) => (
                      <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <svg className="w-4 h-4 text-accent-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link to="/register" className={`w-full justify-center ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}>{t('home.pricing.cta')}</Link>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-gray-400 mt-6">{t('home.pricing.contactNote')}</p>
          </div>
        </section>
      </RevealBox>

      {/* FAQ */}
      <section className="py-24">
        <div className="page-container max-w-3xl">
          <RevealBox>
            <div className="text-center mb-16">
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary-600 dark:text-primary-400 mb-3">FAQ</span>
              <h2 className="section-title mb-4">Questions fréquentes</h2>
              <p className="section-subtitle mx-auto">Tout ce que vous devez savoir sur MikConnect.</p>
            </div>
          </RevealBox>
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <RevealBox key={i} delay={i * 0.06}>
                <div className="card cursor-pointer hover:border-primary-500/30 transition-all duration-300" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-medium text-gray-900 dark:text-white">{item.q}</h3>
                    <svg className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-48 mt-3' : 'max-h-0'}`}>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.a}</p>
                  </div>
                </div>
              </RevealBox>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <RevealBox delay={0.2}>
        <section className="py-24 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="page-container">
            <div className="glass-card p-12 md:p-16 text-center max-w-3xl mx-auto relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-600/5 via-accent-600/5 to-primary-600/5" />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">{t('home.cta.title')}</h2>
                <p className="text-lg text-gray-500 dark:text-gray-400 mb-8 max-w-lg mx-auto">{t('home.cta.subtitle')}</p>
                <Link to="/register" className="btn-primary text-lg px-10 py-3.5 shadow-xl shadow-primary-500/20 hover:shadow-2xl hover:shadow-primary-500/30">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  {t('home.cta.button')}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </RevealBox>
    </div>
  );
}