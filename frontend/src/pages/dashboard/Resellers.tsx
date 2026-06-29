import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { useToast } from '../../lib/toast';
import Modal from '../../components/Modal';

export default function Resellers() {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [resellers, setResellers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', commission: '0' });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const load = () => api.get('/resellers').then((r) => setResellers(r.data.data || r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ name: '', phone: '', email: '', commission: '0' });

  const handleEdit = (r: any) => {
    setForm({ name: r.name, phone: r.phone, email: r.email || '', commission: String(r.commission) });
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, commission: parseFloat(form.commission) };
      if (editingId) { await api.put(`/resellers/${editingId}`, payload); addToast('Revendeur mis à jour', 'success'); }
      else { await api.post('/resellers', payload); addToast('Revendeur ajouté avec succès', 'success'); }
      resetForm(); setShowForm(false); setEditingId(null); load();
    } catch (err: any) { addToast(err?.response?.data?.error || 'Erreur', 'error'); }
    setSubmitting(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try { await api.delete(`/resellers/${deleteTarget}`); addToast('Revendeur supprimé', 'success'); load(); }
    catch { addToast('Erreur lors de la suppression', 'error'); }
    setDeleteTarget(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{t('dashboard.resellers')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gérez vos revendeurs et leurs commissions</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); if (!showForm) { resetForm(); setEditingId(null); } }} className={showForm ? 'btn-secondary' : 'btn-primary'}>
          <svg className={`w-4 h-4 transition-transform duration-300 ${showForm ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          {showForm ? 'Fermer' : 'Ajouter'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card relative overflow-hidden animate-scale-in">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
          <div className="grid md:grid-cols-4 gap-5">
            <div className="md:col-span-4">
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{editingId ? 'Modifier le revendeur' : 'Ajouter un revendeur'}</h3>
              <p className="text-sm text-gray-500">Configurez les commissions de vos revendeurs</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Nom complet</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Fatou Diop" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Téléphone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Ex: +221 77 123 45 67" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="fatou@exemple.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Commission (%)</label>
              <div className="flex gap-2">
                {[5, 10, 15, 20, 25].map((c) => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, commission: String(c) })} className={`px-3 py-2 text-sm rounded-lg border transition-all ${String(c) === form.commission ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'}`}>{c}%</button>
                ))}
              </div>
            </div>
            <div className="md:col-span-4 flex gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
                {submitting ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                {editingId ? 'Mettre à jour' : 'Ajouter'}
              </button>
              <button type="button" onClick={() => { resetForm(); setShowForm(false); setEditingId(null); }} className="btn-secondary">Annuler</button>
            </div>
          </div>
        </form>
      )}

      {resellers.length === 0 && (
        <div className="card text-center py-16 animate-scale-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-50 dark:from-amber-900/30 dark:to-orange-800/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <p className="text-gray-500 font-medium">Aucun revendeur pour le moment</p>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary mt-5">Ajouter un revendeur</button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {resellers.map((r) => (
          <div key={r.id} className="card-hover animate-scale-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold shadow-md shadow-amber-500/20">{r.name.charAt(0).toUpperCase()}</div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{r.name}</p>
                  <p className="text-sm text-gray-500">{r.phone}{r.email ? ` • ${r.email}` : ''}</p>
                </div>
              </div>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-xl border border-amber-200/50 dark:border-amber-800/30">{r.commission}%</span>
            </div>
            <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => handleEdit(r)} className="flex-1 py-2 text-sm font-medium rounded-xl bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.08] text-gray-600 dark:text-gray-400 transition-all flex items-center justify-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Modifier
              </button>
              <button onClick={() => setDeleteTarget(r.id)} className="flex-1 py-2 text-sm font-medium rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 transition-all flex items-center justify-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} title="Supprimer le revendeur" confirmText="Supprimer" confirmClass="bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-5 rounded-xl transition-all inline-flex items-center gap-2 shadow-lg shadow-red-500/20">
        Êtes-vous sûr de vouloir supprimer ce revendeur ?
      </Modal>
    </div>
  );
}