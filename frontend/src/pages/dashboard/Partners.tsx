import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { useToast } from '../../lib/toast';
import Modal from '../../components/Modal';

const TYPE_CONFIG: Record<string, { label: string; color: string; gradient: string }> = {
  TECHNOLOGY: { label: 'Technologie', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/30', gradient: 'from-blue-500 to-cyan-500' },
  ISP: { label: 'FAI', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/30', gradient: 'from-emerald-500 to-teal-500' },
  HARDWARE: { label: 'Matériel', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/30', gradient: 'from-amber-500 to-orange-500' },
  OTHER: { label: 'Autre', color: 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200/50 dark:border-gray-700/30', gradient: 'from-gray-500 to-gray-600' },
};

export default function Partners() {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [partners, setPartners] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'TECHNOLOGY', contactName: '', contactEmail: '', commission: '10' });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const load = () => api.get('/partners').then((r) => setPartners(r.data.data || r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ name: '', type: 'TECHNOLOGY', contactName: '', contactEmail: '', commission: '10' });

  const handleEdit = (p: any) => {
    setForm({ name: p.name, type: p.type, contactName: p.contactName || '', contactEmail: p.contactEmail || '', commission: String(p.commission) });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, commission: parseFloat(form.commission) };
      if (editingId) { await api.put(`/partners/${editingId}`, payload); addToast('Partenaire mis à jour', 'success'); }
      else { await api.post('/partners', payload); addToast('Partenaire ajouté', 'success'); }
      resetForm(); setShowForm(false); setEditingId(null); load();
    } catch { addToast('Erreur', 'error'); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try { await api.delete(`/partners/${deleteTarget}`); addToast('Partenaire supprimé', 'success'); load(); }
    catch { addToast('Erreur', 'error'); }
    setDeleteTarget(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{t('dashboard.partners')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gérez vos partenaires technologiques</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); if (!showForm) { resetForm(); setEditingId(null); } }} className={showForm ? 'btn-secondary' : 'btn-primary'}>
          <svg className={`w-4 h-4 transition-transform duration-300 ${showForm ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          {showForm ? 'Fermer' : t('dashboard.add')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card relative overflow-hidden animate-scale-in">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
          <div className="grid md:grid-cols-5 gap-5">
            <div className="md:col-span-5"><h3 className="font-semibold text-gray-900 dark:text-white text-lg">{editingId ? 'Modifier le partenaire' : 'Ajouter un partenaire'}</h3></div>
            <div><label className="block text-sm font-medium mb-1.5">Nom</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div><label className="block text-sm font-medium mb-1.5">Type</label>
              <div className="flex gap-1.5 flex-wrap">{Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <button key={k} type="button" onClick={() => setForm({ ...form, type: k })} className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${form.type === k ? v.color + ' shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}>{v.label}</button>
              ))}</div>
            </div>
            <div><label className="block text-sm font-medium mb-1.5">Contact</label><input className="input" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="Nom du contact" /></div>
            <div><label className="block text-sm font-medium mb-1.5">Email</label><input type="email" className="input" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} placeholder="contact@exemple.com" /></div>
            <div><label className="block text-sm font-medium mb-1.5">Commission (%)</label>
              <div className="flex gap-1.5 flex-wrap">{[5, 10, 15, 20, 25].map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, commission: String(c) })} className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${String(c) === form.commission ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-300' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'}`}>{c}%</button>
              ))}</div>
            </div>
            <div className="md:col-span-5 flex gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button type="submit" className="btn-primary"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{editingId ? 'Mettre à jour' : t('dashboard.add')}</button>
              <button type="button" onClick={() => { resetForm(); setShowForm(false); setEditingId(null); }} className="btn-secondary">{t('common.cancel')}</button>
            </div>
          </div>
        </form>
      )}

      {partners.length === 0 && <div className="card text-center py-12 text-gray-500">{t('dashboard.noData')}</div>}

      <div className="grid md:grid-cols-2 gap-4">
        {partners.map((p) => {
          const cfg = TYPE_CONFIG[p.type] || TYPE_CONFIG.OTHER;
          return (
            <div key={p.id} className="card-hover animate-scale-in">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white text-sm font-bold shadow-md`}>{p.name.charAt(0).toUpperCase()}</div>
                  <div><p className="font-semibold text-gray-900 dark:text-white">{p.name}</p><p className="text-xs text-gray-500">{p.contactName}{p.contactEmail ? ` • ${p.contactEmail}` : ''}</p></div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>{cfg.label}</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{p.commission}% commission</span>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(p)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.04] text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => setDeleteTarget(p.id)} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} title="Supprimer le partenaire" confirmText="Supprimer" confirmClass="bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-5 rounded-xl transition-all inline-flex items-center gap-2 shadow-lg shadow-red-500/20">
        Êtes-vous sûr de vouloir supprimer ce partenaire ?
      </Modal>
    </div>
  );
}