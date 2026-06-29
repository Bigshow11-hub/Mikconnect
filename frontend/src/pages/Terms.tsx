import { useI18n } from '../lib/i18n';

export default function Terms() {
  const { t } = useI18n();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 prose dark:prose-invert">
      <h1>{t('terms.title')}</h1>
      <p>En utilisant MikConnect, vous acceptez les présentes conditions d'utilisation.</p>
      <h2>1. Service</h2>
      <p>MikConnect est une plateforme SaaS de gestion pour micro FAI, WiFi Zones et cyber cafés. Nous nous réservons le droit de modifier ou interrompre le service à tout moment.</p>
      <h2>2. Compte</h2>
      <p>Vous êtes responsable de la confidentialité de vos identifiants et de toutes les activités sous votre compte.</p>
      <h2>3. Paiement</h2>
      <p>Les abonnements sont facturés mensuellement ou annuellement. Aucun remboursement n'est effectué pour les mois entamés.</p>
      <h2>4. Limitation de responsabilité</h2>
      <p>MikConnect ne peut être tenu responsable des interruptions de service liées aux routeurs, FAI ou infrastructures tierces.</p>
    </div>
  );
}
