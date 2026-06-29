import { useState, useEffect, useMemo } from 'react';
import api from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import Pagination from '../../components/Pagination';

const STATUS_CONFIG: Record<string, { label: string; color: string; gradient: string }> = {
  PENDING: { label: 'En attente', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/30', gradient: 'from-amber-500 to-orange-500' },
  COMPLETED: { label: 'Complétée', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/30', gradient: 'from-emerald-500 to-teal-500' },
  FAILED: { label: 'Échouée', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200/50 dark:border-red-800/30', gradient: 'from-red-500 to-rose-500' },
  REFUNDED: { label: 'Remboursée', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/30', gradient: 'from-blue-500 to-indigo-500' },
};

const METHOD_NAMES: Record<string, string> = { WAVE: 'Wave', ORANGE_MONEY: 'Orange Money', FREE_MONEY: 'Free Money', MTN: 'MTN Money', MOOV: 'Moov Money', CARD: 'Carte bancaire' };
const METHOD_GRADIENTS: Record<string, string> = { WAVE: 'from-teal-500 to-emerald-500', ORANGE_MONEY: 'from-orange-500 to-red-500', FREE_MONEY: 'from-cyan-500 to-blue-500', MTN: 'from-yellow-500 to-amber-500', MOOV: 'from-red-500 to-rose-500', CARD: 'from-violet-500 to-purple-500' };

const PAGE_SIZE = 10;

export default function Transactions() {
  const { t } = useI18n();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { api.get('/transactions').then((r) => setTransactions(r.data.data || r.data)).catch(() => {}); }, []);

  const filtered = useMemo(() => {
    let list = transactions;
    if (search) { const q = search.toLowerCase(); list = list.filter((tx) => tx.reference?.toLowerCase().includes(q) || tx.phoneNumber?.includes(q) || String(tx.amount).includes(q)); }
    if (statusFilter) list = list.filter((tx) => tx.status === statusFilter);
    if (methodFilter) list = list.filter((tx) => tx.method === methodFilter);
    return list;
  }, [transactions, search, statusFilter, methodFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const downloadPDF = () => { const token = localStorage.getItem('token'); window.open(`/api/exports/transactions/pdf?token=${token}`, '_blank'); };
  const downloadCSV = () => { const token = localStorage.getItem('token'); window.open(`/api/exports/transactions/csv?token=${token}`, '_blank'); };

  useEffect(() => { setPage(1); }, [search, statusFilter, methodFilter]);

  const summary = useMemo(() => ({
    total: filtered.reduce((s, tx) => s + tx.amount, 0),
    count: filtered.length,
    completed: filtered.filter((tx) => tx.status === 'COMPLETED').reduce((s, tx) => s + tx.amount, 0),
  }), [filtered]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{t('dashboard.transactions')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Suivez toutes vos transactions financières</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadPDF} className="btn-secondary text-sm py-2 px-4"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>PDF</button>
          <button onClick={downloadCSV} className="btn-secondary text-sm py-2 px-4"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total', value: summary.total, gradient: 'from-gray-600 to-gray-500', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'Complétées', value: summary.completed, gradient: 'from-emerald-600 to-emerald-500', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'En attente / Échouées', value: summary.total - summary.completed, gradient: 'from-amber-600 to-amber-500', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z' },
        ].map((s, i) => (
          <div key={i} className="card relative overflow-hidden group hover:shadow-lg transition-all">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${s.gradient} opacity-[0.04] rounded-full -translate-y-1/2 translate-x-1/2`} />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}<span className="text-sm font-normal text-gray-400 ml-1">XOF</span></p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input className="input pl-9" placeholder="Rechercher par référence, téléphone, montant..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="input w-auto" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
            <option value="">Toutes les méthodes</option>
            {Object.entries(METHOD_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <span className="text-sm text-gray-500 flex items-center shrink-0">{filtered.length} résultat(s)</span>
        </div>
      </div>

      {paginated.length === 0 && <div className="card text-center py-12 text-gray-500">{t('dashboard.noData')}</div>}

      <div className="grid gap-3">
        {paginated.map((tx) => (
          <div key={tx.id} className="card-hover animate-scale-in">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${METHOD_GRADIENTS[tx.method] || 'from-gray-500 to-gray-600'} flex items-center justify-center text-white shadow-md shrink-0`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tx.method === 'CARD' ? 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' : 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'} /></svg>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white">{tx.amount.toLocaleString()} <span className="text-sm font-normal text-gray-400">XOF</span></p>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium">{METHOD_NAMES[tx.method] || tx.method}</span>
                    {tx.phoneNumber && <><span className="text-gray-300">•</span>{tx.phoneNumber}</>}
                    {tx.reference && <><span className="text-gray-300">•</span><span className="font-mono text-gray-400">{tx.reference.slice(0, 12)}</span></>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <StatusBadge status={tx.status} />
                <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return <span className="text-xs px-2.5 py-1 rounded-full border bg-gray-100 text-gray-600">{status}</span>;
  return <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}><span className={`w-1.5 h-1.5 rounded-full ${status === 'PENDING' ? 'bg-amber-500 animate-pulse' : status === 'COMPLETED' ? 'bg-emerald-500' : status === 'FAILED' ? 'bg-red-500' : 'bg-blue-500'}`} />{cfg.label}</span>;
}