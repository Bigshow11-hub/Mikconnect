import { useI18n } from '../lib/i18n';

export default function Privacy() {
  const { t } = useI18n();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 prose dark:prose-invert">
      <h1>{t('privacy.title')}</h1>
      <p>MikConnect s'engage à protéger vos données personnelles.</p>
      <h2>Données collectées</h2>
      <p>Nous collectons votre nom, email, numéro de téléphone et informations de paiement nécessaires au service.</p>
      <h2>Utilisation</h2>
      <p>Vos données sont utilisées uniquement pour fournir et améliorer le service MikConnect.</p>
      <h2>Protection</h2>
      <p>Nous utilisons le chiffrement SSL/TLS pour toutes les communications. Vos mots de passe sont hashés avec bcrypt.</p>
      <h2>Contact</h2>
      <p>Pour toute question : contact@mikconnect.com</p>
    </div>
  );
}
