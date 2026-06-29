/**
 * Vouchers — avec stagger, skeleton, hover effects, delete-collapse
 */
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import api from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import Pagination from '../../components/Pagination';
import { useToast } from '../../lib/toast';
import AnimatedButton from '../../components/Motion/AnimatedButton';
import Skeleton from '../../components/Motion/Skeleton';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/30',
  USED: 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200/50 dark:border-gray-700/30',
  EXPIRED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200/50 dark:border-red-800/30',
};
const QTY_PRESETS = [5, 10, 25, 50, 100, 200];
const PAGE_SIZE = 10;

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[status] || ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : status === 'USED' ? 'bg-gray-400' : 'bg-red-500'}`} />
      {status}
    </span>
  );
}

export default function Vouchers() {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateForm, setGenerateForm] = useState({ planId: '', hotspotId: '', quantity: '10' });
  const [result, setResult] = useState<any>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const reduce = useReducedMotion();

  const load = () => {
    Promise.all([
      api.get('/vouchers').catch(() => ({ data: [] })),
      api.get('/plans').catch(() => ({ data: [] })),
      api.get('/hotspots').catch(() => ({ data: [] })),
    ]).then(([vr, pr, hr]) => {
      setVouchers(vr.data.data || vr.data);
      setPlans(pr.data.data || pr.data);
      setHotspots(hr.data.data || hr.data);
      setLoading(false);
    });
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = vouchers;
    if (search) { const q = search.toLowerCase(); list = list.filter((v) => v.code.toLowerCase().includes(q) || v.plan?.name?.toLowerCase().includes(q)); }
    if (statusFilter) list = list.filter((v) => v.status === statusFilter);
    return list;
  }, [vouchers, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/vouchers/generate', { ...generateForm, quantity: parseInt(generateForm.quantity) });
      setResult(data);
      addToast(`${data.quantity} tickets générés avec succès`, 'success');
      load();
    } catch { addToast('Erreur lors de la génération', 'error'); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/vouchers/${deleteTarget}`);
      addToast('Ticket supprimé', 'success');
      setVouchers(prev => prev.filter(v => v.id !== deleteTarget));
    } catch { addToast('Erreur lors de la suppression', 'error'); }
    setDeleteTarget(null);
  };

  const downloadPDF = (id: string) => { const token = localStorage.getItem('token'); window.open(`/api/exports/voucher/${id}/pdf?token=${token}`, '_blank'); };
  const downloadCSV = () => { const token = localStorage.getItem('token'); window.open(`/api/exports/vouchers/csv?token=${token}`, '_blank'); };
  const toggleSelect = (id: string) => { const next = new Set(selected); if (next.has(id)) next.delete(id); else next.add(id); setSelected(next); };
  const selectAll = () => { if (selected.size === paginated.length) setSelected(new Set()); else setSelected(new Set(paginated.map((v) => v.id))); };
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{t('dashboard.vouchers')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gérez et générez vos tickets WiFi</p>
        </div>
        <div className="flex gap-2">
          <AnimatedButton variant="secondary" onClick={downloadCSV}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            CSV
          </AnimatedButton>
        </div>
      </div>

      {/* Generate form */}
      <form onSubmit={handleGenerate} className="card relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500" />
        <h2 className="font-semibold text-gray-900 dark:text-white text-lg mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Générer des tickets
        </h2>
        <div className="grid md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Offre</label>
            <select className="input" value={generateForm.planId} onChange={(e) => setGenerateForm({ ...generateForm, planId: e.target.value })} required>
              <option value="">Sélectionner</option>
              {plans.map((p: any) => <option key={p.id} value={p.id}>{p.name} - {p.price} XOF</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Hotspot</label>
            <select className="input" value={generateForm.hotspotId} onChange={(e) => setGenerateForm({ ...generateForm, hotspotId: e.target.value })} required>
              <option value="">Sélectionner</option>
              {hotspots.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Quantité</label>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {QTY_PRESETS.map((q) => (
                <button key={q} type="button" onClick={() => setGenerateForm({ ...generateForm, quantity: String(q) })}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${String(q) === generateForm.quantity ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                  {q}
                </button>
              ))}
            </div>
            <input type="number" className="input" value={generateForm.quantity} onChange={(e) => setGenerateForm({ ...generateForm, quantity: e.target.value })} min="1" />
          </div>
          <div className="flex items-end">
            <AnimatedButton type="submit" variant="primary" className="w-full justify-center">Générer</AnimatedButton>
          </div>
        </div>
      </form>

      {/* Result panel */}
      <AnimatePresence>
        {result && (
          <motion.div
            className="card bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 border-emerald-200 dark:border-emerald-800/50"
            initial={reduce ? {} : { opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center text-white shadow-md">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div><p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{result.quantity} tickets générés</p><p className="text-xs text-emerald-600 dark:text-emerald-400">{result.plan}</p></div>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.codes?.map((code: string) => (
                <motion.span key={code} initial={reduce ? {} : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="font-mono text-sm bg-white dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-sm hover:shadow-md transition-shadow cursor-default">
                  {code}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      {!loading && vouchers.length > 0 && (
        <div className="card">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input className="input pl-9" placeholder="Rechercher par code ou offre..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tous les statuts</option>
              <option value="ACTIVE">Actif</option>
              <option value="USED">Utilisé</option>
              <option value="EXPIRED">Expiré</option>
            </select>
            <span className="text-sm text-gray-500 flex items-center shrink-0">{filtered.length} résultat(s)</span>
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="card-hover">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <Skeleton variant="line" width={20} height={20} />
                  <Skeleton variant="line" height={24} width={120} />
                  <Skeleton variant="line" height={20} width={70} />
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <Skeleton variant="line" height={16} width={80} />
                  <Skeleton variant="line" height={16} width={60} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <motion.div className="card text-center py-12" initial={reduce ? {} : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <p className="text-gray-500">{t('dashboard.noData')}</p>
        </motion.div>
      )}

      {/* Selection bar */}
      {!loading && paginated.length > 0 && (
        <div className="flex items-center gap-2 pb-1">
          <input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={selectAll} className="rounded-lg border-gray-300 dark:border-gray-600 w-4 h-4" />
          <span className="text-xs text-gray-500">{selected.size > 0 ? `${selected.size} sélectionné(s)` : 'Tout sélectionner'}</span>
        </div>
      )}

      {/* List with stagger */}
      {!loading && paginated.length > 0 && (
        <div className="grid gap-3">
          <AnimatePresence initial={false}>
            {paginated.map((v, i) => (
              <motion.div
                key={v.id}
                layout
                initial={reduce ? {} : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, delay: reduce ? 0 : i * 0.04, ease: EASE }}
              >
                <motion.div
                  className="card-hover"
                  whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
                  whileTap={{ scale: 0.995 }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggleSelect(v.id)} className="rounded-lg border-gray-300 dark:border-gray-600 w-4 h-4 shrink-0" />
                      <span className="font-mono font-bold text-gray-900 dark:text-white text-lg">{v.code}</span>
                      <StatusBadge status={v.status} />
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right text-sm">
                        <p className="font-semibold">{v.price?.toLocaleString() || 0} XOF</p>
                        <p className="text-xs text-gray-400">{v.plan?.name}</p>
                      </div>
                      <div className="text-right text-xs text-gray-400 hidden sm:block">
                        <p className="text-gray-500 font-medium">{v.hotspot?.name}</p>
                        <p>{new Date(v.createdAt).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => downloadPDF(v.id)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.04] text-gray-400 hover:text-gray-700 transition-all" title="Télécharger PDF">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Delete modal */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} title="Supprimer le ticket" confirmText="Supprimer" />
    </div>
  );
}

// Inline Modal to avoid import issues (Modal.tsx already exists)
function Modal({ open, onClose, onConfirm, title, confirmText, children }: any) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative bg-white dark:bg-[var(--bg-secondary)] rounded-2xl p-6 max-w-md w-full shadow-2xl"
            initial={reduce ? {} : { scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
            <p className="text-gray-500 text-sm mb-6">{children}</p>
            <div className="flex gap-3 justify-end">
              <AnimatedButton variant="secondary" onClick={onClose}>Annuler</AnimatedButton>
              <AnimatedButton variant="primary" onClick={onConfirm}>{confirmText}</AnimatedButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}