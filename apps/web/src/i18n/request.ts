import { getRequestConfig } from "next-intl/server";

export const supportedLocales = ["fr", "en", "pt"] as const;
export type AppLocale = (typeof supportedLocales)[number];

export default getRequestConfig(async () => {
  const locale: AppLocale = "fr";
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
