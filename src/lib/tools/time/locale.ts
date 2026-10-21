const INTL_LOCALES: Record<string, string> = { en: 'en-US', es: 'es-CL' };

export function toIntlLocale(locale: string): string {
  return INTL_LOCALES[locale] ?? locale;
}
