import { useI18n } from '../lib/i18n';

export default function Partners() {
  const { t } = useI18n();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">{t('partners.title')}</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-12">
        Devenez partenaire MikConnect et gagnez des commissions en recommandant notre solution à vos clients.
      </p>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="card text-center">
          <div className="text-4xl mb-4">💰</div>
          <h3 className="font-semibold mb-2">{t('partners.feature1.title')}</h3>
          <p className="text-sm text-gray-500">Sur chaque abonnement plein tarif parrainé</p>
        </div>
        <div className="card text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h3 className="font-semibold mb-2">{t('partners.feature2.title')}</h3>
          <p className="text-sm text-gray-500">Suivez vos referrals en temps réel</p>
        </div>
        <div className="card text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="font-semibold mb-2">{t('partners.feature3.title')}</h3>
          <p className="text-sm text-gray-500">Visualisez vos gains et performances</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('partners.howItWorks')}</h2>
        <ol className="space-y-4 text-gray-600 dark:text-gray-400">
          <li className="flex gap-3"><span className="font-bold text-primary-600">1.</span> Inscrivez-vous au programme partenaire</li>
          <li className="flex gap-3"><span className="font-bold text-primary-600">2.</span> Partagez votre lien de parrainage unique</li>
          <li className="flex gap-3"><span className="font-bold text-primary-600">3.</span> Gagnez 10% de commission sur chaque abonnement mensuel ou annuel</li>
          <li className="flex gap-3"><span className="font-bold text-primary-600">4.</span> Suivez vos gains et demandez vos paiements</li>
        </ol>
      </div>
    </div>
  );
}
