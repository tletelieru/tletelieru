export const locales = ['en', 'es'] as const;

export type Locale = (typeof locales)[number];

export type Localized<T = string> = Record<Locale, T>;

export const defaultLocale: Locale = 'en';

export const localeLabels: Localized = { en: 'English', es: 'Español' };

export const preferredLocaleKey = 'preferred-lang';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

export function toLocale(value: string | undefined | null): Locale {
  const short = value?.toLowerCase().split('-')[0];
  return isLocale(short) ? short : defaultLocale;
}

export function pickLocale(saved: string | null, browserLanguages: readonly string[]): Locale {
  if (isLocale(saved)) return saved;
  for (const language of browserLanguages) {
    const short = language.toLowerCase().split('-')[0];
    if (isLocale(short)) return short;
  }
  return defaultLocale;
}
