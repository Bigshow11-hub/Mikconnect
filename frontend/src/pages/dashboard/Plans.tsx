import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { useToast } from '../../lib/toast';
import Modal from '../../components/Modal';

const formatDuration = (minutes: number): string => {
  if (minutes >= 1440) { const d = Math.floor(minutes / 1440); const h = Math.floor((minutes % 1440) / 60); return h ? `${d}j ${h}h` : `${d}j`; }
  if (minutes >= 60) { const h = Math.floor(minutes / 60); const m = minutes % 60; return m ? `${h}h ${m}` : `${h}h`; }
  return `${minutes} min`;
};

const TYPE_CONFIG: Record<string, { label: string; color: string; gradient: string; presets: { label: string; value: number }[] }> = {
  HOURLY:   { label: 'Horaire',   color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/30',   gradient: 'from-blue-500 to-cyan-500',   presets: [{ label: '30 min', value: 30 }, { label: '1h', value: 60 }, { label: '2h', value: 120 }, { label: '6h', value: 360 }, { label: '12h', value: 720 }] },
  DAILY:    { label: 'Journalier', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/30', gradient: 'from-emerald-500 to-teal-500',   presets: [{ label: '1j', value: 1440 }, { label: '2j', value: 2880 }, { label: '3j', value: 4320 }, { label: '5j', value: 7200 }, { label: '7j', value: 10080 }] },
  WEEKLY:   { label: 'Hebdomadaire', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/30', gradient: 'from-amber-500 to-orange-500', presets: [{ label: '1 sem', value: 10080 }, { label: '2 sem', value: 20160 }] },
  MONTHLY:  { label: 'Mensuel',  color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border-violet-200/50 dark:border-violet-800/30', gradient: 'from-violet-500 to-purple-500', presets: [{ label: '1 mois', value: 43200 }, { label: '3 mois', value: 129600 }] },
};

const BANDWIDTH_PRESETS = ['', '512 Kbps', '1 Mbps', '2 Mbps', '5 Mbps', '10 Mbps', '20 Mbps', '50 Mbps', '100 Mbps'];
const PRICE_PRESETS = [250, 500, 1000, 1500, 2000, 2500, 5000, 10000, 25000, 50000];

export default function Plans() {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'DAILY', duration: '1440', price: '500', bandwidth: '', hotspotId: '' });
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/plans').then((r) => setPlans(r.data.data || r.data)),
      api.get('/hotspots').then((r) => setHotspots(r.data.data || r.data)),
    ]).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ name: '', type: 'DAILY', duration: '1440', price: '500', bandwidth: '', hotspotId: '' }); setEditingId(null); };

  const handleEdit = (plan: any) => {
    setForm({ name: plan.name, type: plan.type, duration: String(plan.duration), price: String(plan.price), bandwidth: plan.bandwidth || '', hotspotId: plan.hotspotId });
    setEditingId(plan.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => { setDeleteTarget(id); };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try { await api.delete(`/plans/${deleteTarget}`); addToast('Offre supprimée avec succès', 'success'); load(); }
    catch { addToast('Erreur lors de la suppression', 'error'); }
    setDeleteTarget(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, duration: parseInt(form.duration), price: parseFloat(form.price) };
      if (editingId) { await api.put(`/plans/${editingId}`, payload); addToast('Offre mise à jour avec succès', 'success'); }
      else { await api.post('/plans', payload); addToast('Offre créée avec succès', 'success'); }
      resetForm(); setShowForm(false); load();
    } catch (err: any) { addToast(err?.response?.data?.error || err?.message || 'Une erreur est survenue', 'error'); }
  };

  const filtered = plans.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && p.type !== typeFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-10 w-28 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse"><div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-800 rounded mb-3" /><div className="h-8 w-1/2 bg-gray-200 dark:bg-gray-800 rounded mb-2" /><div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-800 rounded" /></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{t('dashboard.plans')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gérez vos offres internet</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); if (!showForm) resetForm(); }} className={`${showForm ? 'btn-secondary' : 'btn-primary'}`}>
          <svg className={`w-4 h-4 transition-transform duration-300 ${showForm ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          {showForm ? 'Fermer' : 'Nouvelle offre'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card relative overflow-hidden animate-scale-in">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="md:col-span-2 lg:col-span-4">
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{editingId ? "Modifier l'offre" : 'Nouvelle offre'}</h3>
              <p className="text-sm text-gray-500">Configurez les paramètres de votre offre internet</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nom de l'offre</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: WiFi 1h" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type</label>
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={() => setForm({ ...form, type: key })} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 ${form.type === key ? cfg.color + ' shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}>
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Durée</label>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {TYPE_CONFIG[form.type]?.presets.map((p) => (
                  <button key={p.value} type="button" onClick={() => setForm({ ...form, duration: String(p.value) })} className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${String(p.value) === form.duration ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border-primary-300 dark:border-primary-700' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <input type="number" className="input" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} min="1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Prix (XOF)</label>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {PRICE_PRESETS.map((p) => (
                  <button key={p} type="button" onClick={() => setForm({ ...form, price: String(p) })} className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${String(p) === form.price ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                    {p.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">XOF</span>
                <input type="number" className="input pl-12" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} min="0" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Bande passante</label>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {BANDWIDTH_PRESETS.slice(0, 6).map((bw) => (
                  <button key={bw} type="button" onClick={() => setForm({ ...form, bandwidth: bw })} className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${bw === form.bandwidth ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border-violet-300 dark:border-violet-700' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                    {bw || 'Illimité'}
                  </button>
                ))}
              </div>
              <input className="input" value={form.bandwidth} onChange={(e) => setForm({ ...form, bandwidth: e.target.value })} placeholder="Ex: 10 Mbps" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Hotspot</label>
              <select className="input" value={form.hotspotId} onChange={(e) => setForm({ ...form, hotspotId: e.target.value })} required>
                <option value="">Sélectionner un hotspot</option>
                {hotspots.map((h: any) => <option key={h.id} value={h.id}>{h.name}{h.location ? ` - ${h.location}` : ''}</option>)}
              </select>
            </div>
            <div className="lg:col-span-4 flex gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button type="submit" className="btn-primary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {editingId ? 'Mettre à jour' : t('common.save')}
              </button>
              <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="btn-secondary">{t('common.cancel')}</button>
            </div>
          </div>
        </form>
      )}

      {plans.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input className="input pl-9" placeholder="Rechercher une offre..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Tous les types</option>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <span className="text-sm text-gray-500 flex items-center">{filtered.length} offre(s)</span>
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <div className="card text-center py-16 animate-scale-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/30 dark:to-primary-800/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          </div>
          <p className="text-gray-500 font-medium">{plans.length === 0 ? 'Aucune offre pour le moment' : 'Aucune offre ne correspond à votre recherche'}</p>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary mt-5">{plans.length === 0 ? 'Créer votre première offre' : 'Nouvelle offre'}</button>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
        {filtered.map((p) => (
          <div key={p.id} className="card-hover group relative overflow-hidden animate-scale-in">
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${TYPE_CONFIG[p.type]?.gradient || 'from-primary-500 to-accent-500'}`} />
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{p.name}</h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${TYPE_CONFIG[p.type]?.color || 'bg-gray-100 text-gray-600'}`}>
                {TYPE_CONFIG[p.type]?.label || p.type}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {p.price.toLocaleString()}{' '}
              <span className="text-base font-normal text-gray-400">XOF</span>
            </p>
            <div className="space-y-1.5 mt-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {formatDuration(p.duration)}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                {p.bandwidth || 'Illimité'}
              </div>
              {p.hotspot?.name && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {p.hotspot.name}
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-800 mt-auto">
              <button onClick={() => handleEdit(p)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-xl bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.08] text-gray-700 dark:text-gray-300 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                {t('common.edit')}
              </button>
              <button onClick={() => handleDelete(p.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                {t('common.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} title="Supprimer l'offre" confirmText="Supprimer" confirmClass="bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-5 rounded-xl transition-all inline-flex items-center gap-2 shadow-lg shadow-red-500/20">
        Êtes-vous sûr de vouloir supprimer cette offre ? Cette action est irréversible.
      </Modal>
    </div>
  );
}