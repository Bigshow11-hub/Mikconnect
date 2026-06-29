/**
 * Users — avec stagger, skeleton, hover row effects
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import api from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import AnimatedButton from '../../components/Motion/AnimatedButton';
import Skeleton from '../../components/Motion/Skeleton';

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200/50 dark:border-red-800/30',
  RESELLER: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/30',
  ISP: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/30',
  PARTNER: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200/50 dark:border-purple-800/30',
};
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function Users() {
  const { t } = useI18n();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);
  const reduce = useReducedMotion();

  const load = () => api.get('/users')
    .then((r) => { setUsers(r.data.data || r.data); setLoading(false); })
    .catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const toggleStatus = async (id: string, active: boolean) => {
    setToggling(id);
    try { await api.patch(`/users/${id}`, { active: !active }); load(); } catch { setToggling(null); }
  };

  const filtered = users.filter((u) => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{t('dashboard.users')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gérez les utilisateurs de la plateforme</p>
      </div>

      {/* Search */}
      {!loading && users.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input className="input pl-9" placeholder="Rechercher par nom ou email..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <span className="text-sm text-gray-500 flex items-center shrink-0">{filtered.length} utilisateur(s)</span>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
                <th className="py-3.5 px-5 font-semibold">Utilisateur</th>
                <th className="py-3.5 px-5 font-semibold">Rôle</th>
                <th className="py-3.5 px-5 font-semibold">Pays</th>
                <th className="py-3.5 px-5 font-semibold">Statut</th>
                <th className="py-3.5 px-5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map(i => (
                <tr key={i} className="border-b border-gray-50 dark:border-gray-900">
                  <td className="py-3.5 px-5"><div className="flex items-center gap-3"><Skeleton variant="circle" width={36} height={36} /><div className="space-y-1.5"><Skeleton variant="line" height={14} width={120} /><Skeleton variant="line" height={12} width={180} /></div></div></td>
                  <td className="px-5"><Skeleton variant="line" height={22} width={70} /></td>
                  <td className="px-5"><Skeleton variant="line" height={14} width={60} /></td>
                  <td className="px-5"><Skeleton variant="line" height={22} width={55} /></td>
                  <td className="px-5"><Skeleton variant="line" height={30} width={80} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <motion.div className="card text-center py-12" initial={reduce ? {} : { opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-gray-500">{t('dashboard.noData')}</p>
        </motion.div>
      )}

      {/* Table with hover stagger */}
      {!loading && filtered.length > 0 && (
        <motion.div className="card overflow-hidden p-0" initial={reduce ? {} : { opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
                  <th className="py-3.5 px-5 font-semibold">Utilisateur</th>
                  <th className="py-3.5 px-5 font-semibold">{t('dashboard.role')}</th>
                  <th className="py-3.5 px-5 font-semibold">{t('dashboard.country')}</th>
                  <th className="py-3.5 px-5 font-semibold">{t('dashboard.status')}</th>
                  <th className="py-3.5 px-5 font-semibold">{t('dashboard.actions')}</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      layout
                      initial={reduce ? {} : { opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.2, delay: reduce ? 0 : i * 0.03, ease: EASE }}
                      className="border-b border-gray-50 dark:border-gray-900 last:border-0"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <motion.div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm ${u.role === 'ADMIN' ? 'bg-gradient-to-br from-red-500 to-red-600' : u.role === 'RESELLER' ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-blue-600'}`}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                          />
                          <div>
                            <motion.p whileHover={{ color: 'var(--primary-600)' }} className="font-medium text-gray-900 dark:text-white transition-colors">{u.name}</motion.p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5">
                        <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                      </td>
                      <td className="px-5 text-gray-500">{u.country || '—'}</td>
                      <td className="px-5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.active !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.active !== false ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                          {u.active !== false ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-5">
                        <AnimatedButton
                          variant={u.active !== false ? 'secondary' : 'primary'}
                          state={toggling === u.id ? 'loading' : 'idle'}
                          onClick={() => toggleStatus(u.id, u.active !== false)}
                          className="text-xs"
                        >
                          {u.active !== false ? 'Désactiver' : 'Activer'}
                        </AnimatedButton>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}