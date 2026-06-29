/**
 * Hotspots — avec stagger, skeleton loading, delete-collapse
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import api from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { useToast } from '../../lib/toast';
import Modal from '../../components/Modal';
import AnimatedButton from '../../components/Motion/AnimatedButton';
import Skeleton from '../../components/Motion/Skeleton';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function Hotspots() {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', location: '', routerIp: '', routerPort: '8728', username: '', password: '', bandwidth: '' });
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const reduce = useReducedMotion();

  const load = () => api.get('/hotspots')
    .then((r) => { setHotspots(r.data.data || r.data); setLoading(false); })
    .catch(() => { setLoading(false); });

  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ name: '', location: '', routerIp: '', routerPort: '8728', username: '', password: '', bandwidth: '' });

  const handleEdit = (hs: any) => {
    setForm({ name: hs.name, location: hs.location || '', routerIp: hs.routerIp, routerPort: String(hs.routerPort), username: hs.username, password: '', bandwidth: hs.bandwidth || '' });
    setEditingId(hs.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = editingId ? { ...form, routerPort: parseInt(form.routerPort) } : form;
      if (editingId) { await api.put(`/hotspots/${editingId}`, payload); addToast('Hotspot mis à jour avec succès', 'success'); }
      else { await api.post('/hotspots', payload); addToast('Hotspot créé avec succès', 'success'); }
      resetForm(); setShowForm(false); setEditingId(null); load();
    } catch (err: any) { addToast(err?.response?.data?.error || err?.message || 'Une erreur est survenue', 'error'); }
  };

  const handleDelete = (id: string) => { setDeleteTarget(id); };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try { await api.delete(`/hotspots/${deleteTarget}`); addToast('Hotspot supprimé avec succès', 'success'); load(); }
    catch { addToast('Erreur lors de la suppression', 'error'); }
    setDeleteTarget(null);
  };

  const filtered = hotspots.filter((h) => !search || h.name.toLowerCase().includes(search.toLowerCase()) || h.location?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{t('dashboard.hotspots')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gérez vos hotspots WiFi</p>
        </div>
        <AnimatedButton
          variant={showForm ? 'secondary' : 'primary'}
          onClick={() => { setShowForm(!showForm); if (!showForm) { resetForm(); setEditingId(null); } }}
        >
          <svg className={`w-4 h-4 transition-transform duration-300 ${showForm ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          {showForm ? 'Fermer' : t('dashboard.add')}
        </AnimatedButton>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={reduce ? {} : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500" />
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="md:col-span-2 lg:col-span-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{editingId ? 'Modifier le hotspot' : 'Nouveau hotspot'}</h3>
                  <p className="text-sm text-gray-500">Configurez les accès à votre routeur MikroTik</p>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nom du hotspot</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: WiFi Dakar Centre" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Localisation</label><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ex: Dakar, Sénégal" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Bande passante max</label><input className="input" value={form.bandwidth} onChange={(e) => setForm({ ...form, bandwidth: e.target.value })} placeholder="Ex: 100 Mbps" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">IP du routeur</label><input className="input font-mono" value={form.routerIp} onChange={(e) => setForm({ ...form, routerIp: e.target.value })} placeholder="192.168.88.1" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Port API</label><input type="number" className="input font-mono" value={form.routerPort} onChange={(e) => setForm({ ...form, routerPort: e.target.value })} placeholder="8728" /></div>
                <div />
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Utilisateur MikroTik</label><input className="input font-mono" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="admin" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mot de passe</label><input type="password" className="input font-mono" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editingId ? '•••••••• (laisser vide pour conserver)' : ''} required={!editingId} /></div>
                <div className="flex items-end gap-3">
                  <AnimatedButton type="submit" variant="primary" onClick={handleSubmit}>{editingId ? 'Mettre à jour' : t('common.save')}</AnimatedButton>
                  <AnimatedButton variant="secondary" onClick={() => { resetForm(); setShowForm(false); setEditingId(null); }}>{t('common.cancel')}</AnimatedButton>
                </div>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Search */}
      {hotspots.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input className="input pl-9" placeholder="Rechercher un hotspot..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <span className="text-sm text-gray-500 flex items-center">{filtered.length} hotspot(s)</span>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card-hover relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-cyan-500" />
              <div className="flex items-center justify-between gap-4 ml-4">
                <div className="flex items-center gap-4 min-w-0">
                  <Skeleton variant="circle" width={48} height={48} />
                  <div className="space-y-2 flex-1"><Skeleton variant="line" height={18} width="60%" /><Skeleton variant="line" height={14} width="40%" /></div>
                </div>
                <div className="flex gap-2"><Skeleton variant="line" width={36} height={36} /><Skeleton variant="line" width={36} height={36} /></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <motion.div
          className="card text-center py-16"
          initial={reduce ? {} : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-800/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
          </div>
          <p className="text-gray-500 font-medium">{hotspots.length === 0 ? 'Aucun hotspot pour le moment' : 'Aucun hotspot ne correspond'}</p>
          {hotspots.length === 0 && (
            <AnimatedButton variant="primary" className="mt-5" onClick={() => { resetForm(); setShowForm(true); }}>
              Ajouter votre premier hotspot
            </AnimatedButton>
          )}
        </motion.div>
      )}

      {/* List with stagger + delete-collapse */}
      {!loading && filtered.length > 0 && (
        <div className="grid gap-4">
          <AnimatePresence initial={false}>
            {filtered.map((h) => (
              <motion.div
                key={h.id}
                layout
                initial={reduce ? {} : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                <div className="card-hover relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-cyan-500" />
                  <div className="flex items-center justify-between gap-4 ml-2">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${h.status === 'ACTIVE' ? 'bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        <svg className={`w-6 h-6 ${h.status === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{h.name}</h3>
                        <p className="text-sm text-gray-500 truncate">{h.location ? `${h.location} • ` : ''}{h.routerIp}:{h.routerPort}</p>
                        <div className="flex gap-2 mt-1.5">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${h.status === 'ACTIVE' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${h.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                            {h.status}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">{h._count?.vouchers || 0} tickets</span>
                          {h.bandwidth && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">{h.bandwidth}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleEdit(h)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.04] text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(h.id)} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Supprimer le hotspot"
        confirmText="Supprimer"
      >
        Êtes-vous sûr de vouloir supprimer ce hotspot ? Cette action est irréversible. Tous les tickets liés seront également supprimés.
      </Modal>
    </div>
  );
}