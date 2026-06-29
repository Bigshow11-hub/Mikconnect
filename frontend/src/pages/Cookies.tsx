import { useI18n } from '../lib/i18n';

export default function Cookies() {
  const { t } = useI18n();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 prose dark:prose-invert">
      <h1>{t('cookies.title')}</h1>
      <p>MikConnect utilise des cookies strictement nécessaires au bon fonctionnement de la plateforme.</p>
      <h2>Cookies essentiels</h2>
      <p>Cookies d'authentification et de session pour vous maintenir connecté.</p>
      <h2>Cookies d'analyse</h2>
      <p>Nous utilisons des outils d'analyse anonyme pour améliorer notre service. Vous pouvez les désactiver dans les paramètres de votre navigateur.</p>
      <h2>Gestion des cookies</h2>
      <p>Vous pouvez configurer votre navigateur pour refuser les cookies, mais certaines fonctionnalités pourraient ne plus fonctionner correctement.</p>
    </div>
  );
}
