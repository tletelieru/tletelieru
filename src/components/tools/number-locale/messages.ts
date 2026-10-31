import { defineMessages } from '~/i18n/react';

export const numberLocaleMessages = defineMessages({
  en: {
    numbers: 'Numbers (one per line, dot for decimals)',
    localized: 'Localized numbers (one per line)',
    mode: 'Mode',
    modes: { format: 'Format', parse: 'Parse' },
    locale: 'Locale',
    style: 'Style',
    styles: { plain: 'Plain', currency: 'Currency', percent: 'Percent', compact: 'Compact' },
    currency: 'Currency',
    decimals: 'Decimals (optional)',
    error: (line: number, text: string, parse: boolean) =>
      parse
        ? `Line ${line}: "${text}" does not fit this locale's format`
        : `Line ${line}: "${text}" is not a plain number`,
  },
  es: {
    numbers: 'Números (uno por línea, punto para decimales)',
    localized: 'Números localizados (uno por línea)',
    mode: 'Modo',
    modes: { format: 'Formatear', parse: 'Interpretar' },
    locale: 'Configuración regional',
    style: 'Estilo',
    styles: { plain: 'Simple', currency: 'Moneda', percent: 'Porcentaje', compact: 'Compacto' },
    currency: 'Moneda',
    decimals: 'Decimales (opcional)',
    error: (line: number, text: string, parse: boolean) =>
      parse
        ? `Línea ${line}: "${text}" no coincide con el formato de esta configuración`
        : `Línea ${line}: "${text}" no es un número simple`,
  },
});
