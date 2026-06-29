import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { useToast } from '../../lib/toast';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/30',
  COMPLETED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/30',
  PENDING: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/30',
  SETTLED: 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200/50 dark:border-gray-700/30',
};

function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[status] || ''}`}><span className={`w-1.5 h-1.5 rounded-full ${status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-current'}`} />{status}</span>;
}

export default function Roaming() {
  const { t } = useI18n();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [destHotspotId, setDestHotspotId] = useState('');
  const [tab, setTab] = useState<'sessions' | 'agreements' | 'settlements'>('sessions');
  const [agreementForm, setAgreementForm] = useState({ name: '', providerIspId: '', consumerIspId: '', roamingFee: '0.05' });
  const [settleForm, setSettleForm] = useState({ agreementId: '', periodStart: '', periodEnd: '' });

  const isAdmin = user?.role === 'ADMIN';

  const load = () => {
    api.get('/roaming').then((r) => setSessions(r.data.data || r.data)).catch(() => {});
    api.get('/hotspots').then((r) => setHotspots(r.data.data || r.data)).catch(() => {});
    api.get('/roaming/agreements').then((r) => setAgreements(r.data.data || r.data)).catch(() => {});
    if (isAdmin) api.get('/roaming/settlements').then((r) => setSettlements(r.data.data || r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const handleStartRoaming = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post('/roaming/start', { code, destHotspotId }); setCode(''); setDestHotspotId(''); addToast('Roaming activé avec succès', 'success'); load(); }
    catch (err: any) { addToast(err?.response?.data?.error || 'Erreur', 'error'); }
  };

  const handleEndSession = async (id: string) => {
    await api.post('/roaming/end', { id, dataUsed: 0, sessionDuration: 0 });
    addToast('Session terminée', 'success');
    load();
  };

  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/roaming/agreements', { ...agreementForm, roamingFee: parseFloat(agreementForm.roamingFee) });
    setAgreementForm({ name: '', providerIspId: '', consumerIspId: '', roamingFee: '0.05' });
    addToast('Accord créé', 'success');
    load();
  };

  const handleCreateSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/roaming/settlements', settleForm);
    setSettleForm({ agreementId: '', periodStart: '', periodEnd: '' });
    addToast('Règlement calculé', 'success');
    load();
  };

  const handleSettle = async (id: string) => {
    await api.patch(`/roaming/settlements/${id}/settle`);
    addToast('Règlement approuvé', 'success');
    load();
  };

  const tabs = [
    { key: 'sessions' as const, label: 'Sessions', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { key: 'agreements' as const, label: t('dashboard.roamingAgreements'), icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    ...(isAdmin ? [{ key: 'settlements' as const, label: t('dashboard.settlements'), icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }] : []),
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{t('dashboard.roaming')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gérez le roaming entre hotspots</p>
      </div>

      <div className="flex gap-1.5 bg-gray-100 dark:bg-gray-800/50 rounded-xl p-1.5 w-fit border border-gray-200/50 dark:border-gray-700/30">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t.key ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm border border-gray-200/50 dark:border-gray-600/30' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-transparent'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={t.icon} /></svg>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sessions' && (
        <>
          <form onSubmit={handleStartRoaming} className="card relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-3"><h3 className="font-semibold text-gray-900 dark:text-white">Activer une session roaming</h3><p className="text-sm text-gray-500">Saisissez le code ticket et le hotspot de destination</p></div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Code ticket</label>
                <input className="input font-mono" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required placeholder="Ex: A1B2C3D4" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Hotspot de destination</label>
                <select className="input" value={destHotspotId} onChange={(e) => setDestHotspotId(e.target.value)} required>
                  <option value="">Sélectionner</option>
                  {hotspots.map((h: any) => <option key={h.id} value={h.id}>{h.name}{h.location ? ` - ${h.location}` : ''}</option>)}
                </select>
              </div>
              <div className="flex items-end"><button type="submit" className="btn-primary">Activer le roaming</button></div>
            </div>
          </form>

          <div className="grid gap-3">
            {sessions.length === 0 && <div className="card text-center py-12 text-gray-500">Aucune session roaming</div>}
            {sessions.map((s) => (
              <div key={s.id} className="card-hover animate-scale-in">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white font-mono">{s.code}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="text-primary-500 font-medium">{s.sourceHotspot?.name || s.sourceHotspotId}</span>
                      <svg className="w-3 h-3 inline mx-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      <span className="text-primary-500 font-medium">{s.destHotspot?.name || s.destHotspotId}</span>
                    </p>
                    {(s.dataUsed > 0 || s.sessionDuration > 0) && <p className="text-xs text-gray-400 mt-1">Données: {(s.dataUsed / 1024 / 1024).toFixed(1)} MB • Durée: {Math.floor(s.sessionDuration / 60)} min</p>}
                    {s.settlement && <p className="text-xs text-gray-400 mt-0.5">Règlement: {s.settlement.status}</p>}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{s.amount} XOF</p>
                      {s.roamingFee > 0 && <p className="text-xs text-gray-400">Frais: {(s.roamingFee * 100).toFixed(0)}%</p>}
                    </div>
                    <StatusBadge status={s.status} />
                    {s.status === 'ACTIVE' && <button onClick={() => handleEndSession(s.id)} className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 bg-red-50 dark:bg-red-950/20 px-3 py-1.5 rounded-xl transition-all hover:bg-red-100 dark:hover:bg-red-950/40">Terminer</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'agreements' && (
        <>
          {isAdmin && (
            <form onSubmit={handleCreateAgreement} className="card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="grid md:grid-cols-5 gap-4">
                <div className="md:col-span-5"><h3 className="font-semibold text-gray-900 dark:text-white">Nouvel accord de roaming</h3></div>
                <div><label className="block text-sm font-medium mb-1.5">Nom</label><input className="input" value={agreementForm.name} onChange={(e) => setAgreementForm({ ...agreementForm, name: e.target.value })} required /></div>
                <div><label className="block text-sm font-medium mb-1.5">ISP fournisseur</label><input className="input" value={agreementForm.providerIspId} onChange={(e) => setAgreementForm({ ...agreementForm, providerIspId: e.target.value })} placeholder="User ID" /></div>
                <div><label className="block text-sm font-medium mb-1.5">ISP consommateur</label><input className="input" value={agreementForm.consumerIspId} onChange={(e) => setAgreementForm({ ...agreementForm, consumerIspId: e.target.value })} placeholder="User ID" /></div>
                <div><label className="block text-sm font-medium mb-1.5">Frais roaming (%)</label>
                  <div className="flex gap-1.5 flex-wrap">{['5', '10', '15', '20'].map((f) => <button key={f} type="button" onClick={() => setAgreementForm({ ...agreementForm, roamingFee: (parseInt(f) / 100).toString() })} className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${agreementForm.roamingFee === (parseInt(f) / 100).toString() ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'}`}>{f}%</button>)}</div>
                  <input type="number" step="0.01" className="input mt-2" value={agreementForm.roamingFee} onChange={(e) => setAgreementForm({ ...agreementForm, roamingFee: e.target.value })} />
                </div>
                <div className="flex items-end"><button type="submit" className="btn-primary">Créer l'accord</button></div>
              </div>
            </form>
          )}

          <div className="grid gap-3">
            {agreements.length === 0 && <div className="card text-center py-12 text-gray-500">Aucun accord de roaming</div>}
            {agreements.map((a) => (
              <div key={a.id} className="card-hover animate-scale-in">
                <div className="flex items-center justify-between">
                  <div><p className="font-semibold text-gray-900 dark:text-white">{a.name}</p><p className="text-xs text-gray-500 mt-0.5">Provider: {a.providerIspId} • Consumer: {a.consumerIspId}</p></div>
                  <div className="flex items-center gap-3"><span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${a.isActive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200/50' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200/50 dark:border-gray-700/30'}`}><span className={`w-1.5 h-1.5 rounded-full ${a.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />{a.isActive ? 'Actif' : 'Inactif'}</span><span className="text-sm font-bold text-primary-600">{(a.roamingFee * 100).toFixed(0)}%</span></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'settlements' && isAdmin && (
        <>
          <form onSubmit={handleCreateSettlement} className="card relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-4"><h3 className="font-semibold text-gray-900 dark:text-white">Calculer un règlement</h3></div>
              <div><label className="block text-sm font-medium mb-1.5">Accord</label><select className="input" value={settleForm.agreementId} onChange={(e) => setSettleForm({ ...settleForm, agreementId: e.target.value })} required><option value="">Sélectionner</option>{agreements.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1.5">Début</label><input type="date" className="input" value={settleForm.periodStart} onChange={(e) => setSettleForm({ ...settleForm, periodStart: e.target.value })} required /></div>
              <div><label className="block text-sm font-medium mb-1.5">Fin</label><input type="date" className="input" value={settleForm.periodEnd} onChange={(e) => setSettleForm({ ...settleForm, periodEnd: e.target.value })} required /></div>
              <div className="flex items-end"><button type="submit" className="btn-primary">Calculer</button></div>
            </div>
          </form>

          <div className="grid gap-3">
            {settlements.length === 0 && <div className="card text-center py-12 text-gray-500">Aucun règlement</div>}
            {settlements.map((s) => (
              <div key={s.id} className="card-hover animate-scale-in">
                <div className="flex items-center justify-between gap-4">
                  <div><p className="font-semibold text-gray-900 dark:text-white">{s.agreement?.name || s.agreementId}</p><p className="text-xs text-gray-500 mt-0.5">{new Date(s.periodStart).toLocaleDateString()} - {new Date(s.periodEnd).toLocaleDateString()} • {s.sessions?.length || 0} sessions</p></div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right text-sm"><p className="font-semibold">{s.totalAmount} XOF</p><p className="text-xs text-gray-400">Frais: {s.totalFee} XOF</p><p className="text-xs text-primary-600 font-medium">Net: {s.netAmount} XOF</p></div>
                    <StatusBadge status={s.status} />
                    {s.status === 'PENDING' && <button onClick={() => handleSettle(s.id)} className="btn-primary text-sm py-1.5 px-4">Approuver</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}