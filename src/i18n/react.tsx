import { createContext, useContext, type ReactNode } from 'react';
import { defaultLocale, type Locale, type Localized } from './locales';

const LocaleContext = createContext<Locale>(defaultLocale);

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useMessages<T>(messages: Localized<T>): T {
  return messages[useLocale()];
}

export function defineMessages<T>(messages: { en: T; es: NoInfer<T> }): Localized<T> {
  return messages;
}
