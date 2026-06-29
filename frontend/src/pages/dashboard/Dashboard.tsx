import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import Counter from '../../components/Counter';
import Skeleton from '../../components/Motion/Skeleton';
import { useReveal } from '../../lib/useReveal';

const revenueData = [
  { name: 'Lun', revenu: 45000, tickets: 12 },
  { name: 'Mar', revenu: 62000, tickets: 18 },
  { name: 'Mer', revenu: 38000, tickets: 9 },
  { name: 'Jeu', revenu: 71000, tickets: 21 },
  { name: 'Ven', revenu: 85000, tickets: 25 },
  { name: 'Sam', revenu: 52000, tickets: 14 },
  { name: 'Dim', revenu: 43000, tickets: 11 },
];

const usageData = [
  { time: '00:00', actifs: 23 },
  { time: '04:00', actifs: 12 },
  { time: '08:00', actifs: 45 },
  { time: '12:00', actifs: 78 },
  { time: '16:00', actifs: 92 },
  { time: '20:00', actifs: 67 },
  { time: '23:00', actifs: 34 },
];

const activities = [
  { action: 'Nouveau hotspot ajouté', detail: 'Zone WiFi Dakar Centre', time: 'Il y a 2 min', icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01' },
  { action: 'Ticket généré', detail: '1h - 500 XOF (code: DC-8F3A)', time: 'Il y a 15 min', icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z' },
  { action: 'Paiement reçu', detail: '1 000 XOF via Wave', time: 'Il y a 1 h', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { action: 'Nouveau revendeur', detail: 'Fatou Diop - 5% commission', time: 'Il y a 3 h', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
];

function RevealBox({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useReveal(0.1);
  return (
    <div ref={ref} className={`reveal ${visible ? 'visible' : ''}`} style={{ transitionDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [online, setOnline] = useState<{ totalOnline: number; hotspots: any[] } | null>(null);

  useEffect(() => {
    api.get('/users/stats').then((res) => setStats(res.data)).catch(() => setStats({}));
    api.get('/vouchers').then((r) => setVouchers((r.data.data || r.data).slice(0, 5))).catch(() => {});
    api.get('/hotspots/active').then((r) => setOnline(r.data)).catch(() => setOnline({ totalOnline: 0, hotspots: [] }));
  }, []);

  const getStat = (key: keyof typeof stats, fallback = 0) =>
    stats ? (stats[key] ?? fallback) : fallback;

  const statCards = [
    { label: t('dashboard.hotspots'), value: getStat('totalHotspots'), path: '/dashboard/hotspots', gradient: 'from-blue-600 to-cyan-500', icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01' },
    { label: t('dashboard.vouchers'), value: getStat('totalVouchers'), path: '/dashboard/vouchers', gradient: 'from-emerald-500 to-teal-500', icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z' },
    { label: t('dashboard.activeVouchers'), value: getStat('activeVouchers'), path: '/dashboard/vouchers', gradient: 'from-amber-500 to-orange-500', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Revenus', value: getStat('revenue'), path: '/dashboard/transactions', gradient: 'from-violet-600 to-purple-500', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <RevealBox>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
              Bonjour, <span className="gradient-text-simple">{user?.name}</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Voici un aperçu de votre activité aujourd'hui</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-200/50 dark:border-emerald-800/30">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Système opérationnel
          </div>
        </div>
      </RevealBox>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        {statCards.map((card, i) => (
          <RevealBox key={card.label} delay={i * 0.08}>
            <Link to={card.path} className="card-hover group relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.gradient} opacity-[0.03] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:opacity-[0.06] transition-opacity duration-500`} />
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-3 shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={card.icon} />
                </svg>
              </div>
              {stats === null ? (
                <Skeleton variant="line" height={28} className="mb-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {typeof card.value === 'number' ? (
                    <><Counter end={card.value} />{card.label === 'Revenus' ? <span className="text-lg ml-0.5">XOF</span> : ''}</>
                  ) : (
                    card.value
                  )}
                </p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
            </Link>
          </RevealBox>
        ))}
      </div>

      {/* ── Utilisateurs en ligne ── */}
      {online && (
        <RevealBox delay={0.05}>
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Utilisateurs en ligne</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <motion.span
                    className="w-2 h-2 rounded-full bg-emerald-500"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Temps réel</span>
                </div>
              </div>
              <div className="ml-auto text-right">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{online.totalOnline}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">connecté(s)</p>
              </div>
            </div>

            {online.hotspots.length > 0 ? (
              <div className="space-y-2">
                {online.hotspots.map((hs: any) => (
                  <div key={hs.hotspotId} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] hover:bg-gray-100/60 dark:hover:bg-white/[0.05] transition-colors">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${hs.error ? 'bg-gray-400' : hs.online > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{hs.name || hs.hotspotId}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{hs.location || 'Sans localisation'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-sm font-bold ${hs.error ? 'text-gray-400' : hs.online > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                        {hs.error ? '—' : hs.online}
                      </span>
                      <p className="text-xs text-gray-400 dark:text-gray-500">en ligne</p>
                    </div>
                    {hs.sessions && hs.sessions.length > 0 && (
                      <div className="shrink-0 hidden xl:block">
                        <div className="flex gap-0.5 items-end h-6">
                          {hs.sessions.slice(0, 6).map((_: any, i: number) => (
                            <motion.div
                              key={i}
                              className="w-1.5 bg-emerald-400/60 rounded-sm"
                              initial={{ height: 4 }}
                              animate={{ height: [4, 14, 4] }}
                              transition={{ duration: 1.2, delay: i * 0.15, repeat: Infinity, repeatDelay: 0.5 }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 dark:text-gray-500">
                <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
                <p className="text-sm">Aucun hotspot configuré</p>
                <Link to="/dashboard/hotspots" className="text-xs text-primary-600 hover:text-primary-700 mt-1 inline-block">
                  Ajouter un hotspot →
                </Link>
              </div>
            )}
          </div>
        </RevealBox>
      )}

      <div className="grid lg:grid-cols-2 gap-5 lg:gap-6">
        <RevealBox delay={0.1}>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Revenus hebdomadaires</h2>
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full border border-emerald-200/50 dark:border-emerald-800/30">+12%</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" strokeOpacity={0.5} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--text-primary)', boxShadow: 'var(--shadow-card-hover)' }} />
                <Area type="monotone" dataKey="revenu" stroke="#3b82f6" fill="url(#revenueGrad)" strokeWidth={2.5} animationBegin={300} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </RevealBox>

        <RevealBox delay={0.2}>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Tickets actifs (24h)</h2>
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2.5 py-1 rounded-full border border-blue-200/50 dark:border-blue-800/30">+8%</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" strokeOpacity={0.5} />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--text-primary)', boxShadow: 'var(--shadow-card-hover)' }} />
                <Bar dataKey="actifs" fill="#3b82f6" radius={[6, 6, 0, 0]} animationBegin={400} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </RevealBox>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 lg:gap-6">
        <RevealBox delay={0.1}>
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-5">Démarrage rapide</h2>
            <div className="space-y-4">
              {[
                { step: 1, text: 'Ajoutez votre premier hotspot', link: '/dashboard/hotspots' },
                { step: 2, text: 'Créez vos offres internet', link: '/dashboard/plans' },
                { step: 3, text: 'Générez vos tickets WiFi', link: '/dashboard/vouchers' },
                { step: 4, text: 'Configurez votre portail captif', link: null },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 group">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 group-hover:scale-110 ${
                    item.link
                      ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/20'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  }`}>{item.step}</span>
                  {item.link ? (
                    <Link to={item.link} className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium">{item.text}</Link>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-500">{item.text}</span>
                  )}
                  {item.link && (
                    <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        </RevealBox>

        <RevealBox delay={0.2}>
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-5">Activités récentes</h2>
            <div className="space-y-4">
              {activities.map((a, i) => (
                <div key={i} className="flex items-start gap-3.5 group hover:bg-gray-50 dark:hover:bg-white/[0.02] p-2.5 -mx-2.5 rounded-xl transition-all duration-200">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500/10 to-primary-600/10 dark:from-primary-500/20 dark:to-primary-600/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-4.5 h-4.5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={a.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{a.action}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{a.detail}</p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 mt-0.5">{a.time}</span>
                </div>
              ))}
            </div>
          </div>
        </RevealBox>
      </div>

      {vouchers.length > 0 && (
        <RevealBox delay={0.1}>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Derniers tickets</h2>
              <Link to="/dashboard/vouchers" className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:hover:text-primary-400 transition-colors inline-flex items-center gap-1">
                Voir tout
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    <th className="pb-3 font-medium px-6">Code</th>
                    <th className="pb-3 font-medium px-6">Offre</th>
                    <th className="pb-3 font-medium px-6">Statut</th>
                    <th className="pb-3 font-medium px-6">Créé le</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((v: any, i: number) => (
                    <tr key={v.id} className="border-b border-gray-50 dark:border-gray-900 last:border-0 hover:bg-gray-50/50 dark:hover:bg-white/[0.015] transition-colors">
                      <td className="py-3.5 px-6 font-mono font-semibold text-gray-900 dark:text-white">{v.code}</td>
                      <td className="py-3.5 px-6 text-gray-600 dark:text-gray-400">{v.plan?.name || '-'}</td>
                      <td className="py-3.5 px-6">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          v.status === 'ACTIVE' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30' :
                          v.status === 'USED' ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-200/50 dark:border-gray-700/30' :
                          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-800/30'
                        }`}>{v.status}</span>
                      </td>
                      <td className="py-3.5 px-6 text-gray-500 dark:text-gray-400">{new Date(v.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </RevealBox>
      )}
    </div>
  );
}