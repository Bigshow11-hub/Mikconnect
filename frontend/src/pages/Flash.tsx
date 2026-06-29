import { useI18n } from '../lib/i18n';

export default function Flash() {
  const { t } = useI18n();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-xl">F</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{t('flash.title')}</h1>
      </div>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-12">
        L'application desktop qui configure vos routeurs MikroTik en 30 secondes chrono.
      </p>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="card">
          <div className="text-3xl mb-4">⚡</div>
          <h3 className="font-semibold mb-2">{t('flash.feature1.title')}</h3>
          <p className="text-sm text-gray-500">Entrez l'IP et les identifiants de votre routeur, Flash fait le reste.</p>
        </div>
        <div className="card">
          <div className="text-3xl mb-4">🔄</div>
          <h3 className="font-semibold mb-2">{t('flash.feature2.title')}</h3>
          <p className="text-sm text-gray-500">Configurez tous vos hotspots en un clic depuis une seule application.</p>
        </div>
        <div className="card">
          <div className="text-3xl mb-4">📋</div>
          <h3 className="font-semibold mb-2">{t('flash.feature3.title')}</h3>
          <p className="text-sm text-gray-500">Template pré-configuré avec paiement mobile money intégré.</p>
        </div>
        <div className="card">
          <div className="text-3xl mb-4">🔧</div>
          <h3 className="font-semibold mb-2">{t('flash.feature4.title')}</h3>
          <p className="text-sm text-gray-500">Assistance WhatsApp pour vous accompagner pas à pas.</p>
        </div>
      </div>

      <div className="card text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('flash.download.title')}</h2>
        <p className="text-gray-500 mb-6">{t('flash.download.subtitle')}</p>
        <div className="flex flex-wrap justify-center gap-4">
          <button className="btn-primary">{t('flash.download.windows')}</button>
          <button className="btn-secondary">{t('flash.download.macos')}</button>
          <button className="btn-secondary">{t('flash.download.linux')}</button>
        </div>
      </div>
    </div>
  );
}
