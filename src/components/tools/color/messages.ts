import { defineMessages } from '~/i18n/react';
import type { ColorError } from '~/lib/tools/color';

export const colorMessages = defineMessages({
  en: {
    color: 'Color',
    background: 'Contrast against',
    swatch: 'Swatch',
    preview: 'Contrast preview',
    sample: 'The quick brown fox',
    ratio: (ratio: number) => `Contrast ratio ${ratio.toFixed(2)}:1`,
    normal: 'Normal text',
    large: 'Large text',
    pass: 'pass',
    fail: 'fail',
    error: (error: ColorError, label: string): string =>
      error.code === 'empty'
        ? `${label}: enter a color.`
        : `${label}: "${error.input}" is not a color. Use #hex, rgb(), hsl(), oklch() or a CSS name.`,
  },
  es: {
    color: 'Color',
    background: 'Contraste contra',
    swatch: 'Muestra',
    preview: 'Vista previa del contraste',
    sample: 'El veloz murciélago hindú',
    ratio: (ratio: number) => `Razón de contraste ${ratio.toFixed(2)}:1`,
    normal: 'Texto normal',
    large: 'Texto grande',
    pass: 'cumple',
    fail: 'no cumple',
    error: (error: ColorError, label: string): string =>
      error.code === 'empty'
        ? `${label}: escribe un color.`
        : `${label}: "${error.input}" no es un color. Usa #hex, rgb(), hsl(), oklch() o un nombre CSS.`,
  },
});
