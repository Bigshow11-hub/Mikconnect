import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import fr from './fr.json';
import en from './en.json';

const locales = { fr, en } as const;
type Locale = keyof typeof locales;

interface I18nContextType {
  locale: Locale;
  t: (key: string) => string;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'fr',
  t: (k: string) => k,
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(
    (localStorage.getItem('locale') as Locale) || 'fr'
  );

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('locale', l);
  }, []);

  const t = useCallback(
    (key: string): string => (locales[locale] as Record<string, string>)[key] || key,
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
