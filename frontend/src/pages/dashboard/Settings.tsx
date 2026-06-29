import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { useToast } from '../../lib/toast';

export default function Settings() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', companyName: user?.companyName || '', country: user?.country || '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await api.put('/users/me', form); addToast('Profil mis à jour avec succès', 'success'); }
    catch { addToast('Erreur lors de la sauvegarde', 'error'); }
    setSaving(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{t('dashboard.settings')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gérez vos paramètres personnels et votre abonnement</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={handleSave} className="card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white text-lg mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            Profil
          </h2>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium mb-1.5">Nom</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="block text-sm font-medium mb-1.5">Email</label><input className="input opacity-60 cursor-not-allowed" value={user?.email || ''} disabled /></div>
            <div><label className="block text-sm font-medium mb-1.5">Téléphone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="block text-sm font-medium mb-1.5">Entreprise</label><input className="input" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></div>
            <div><label className="block text-sm font-medium mb-1.5">Pays</label><input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
              {saving ? 'Sauvegarde...' : t('common.save')}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              Configuration du portail captif
            </h2>
            <p className="text-sm text-gray-500 mb-4">Utilisez ces identifiants pour personnaliser votre portail captif MikConnect.</p>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3 border border-gray-100 dark:border-gray-700/30">
              <div><p className="text-xs text-gray-400 mb-1 font-medium">Identifiant API</p><p className="font-mono text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">{user?.id || 'Connectez-vous pour voir'}</p></div>
              <div><p className="text-xs text-gray-400 mb-1 font-medium">URL de callback</p><p className="font-mono text-sm text-primary-600 dark:text-primary-400 bg-white dark:bg-gray-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">https://api.mikconnect.com/captive-portal</p></div>
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              Abonnement
            </h2>
            <p className="text-sm text-gray-500 mb-4">Période d'essai gratuite de 30 jours.</p>
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1.5"><span className="text-gray-500">Stockage utilisé</span><span className="text-gray-400">30%</span></div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden"><div className="bg-gradient-to-r from-primary-500 to-accent-500 h-2.5 rounded-full w-[30%] transition-all duration-500" /></div>
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />30 jours restants sur votre essai</p>
          </div>

          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Aide
            </h2>
            <p className="text-sm text-gray-500 mb-4">Besoin d'aide ? Consultez notre documentation ou contactez le support.</p>
            <div className="flex gap-3">
              <a href="#" className="btn-secondary text-sm py-2">Documentation</a>
              <a href="#" className="btn-secondary text-sm py-2">Support</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}