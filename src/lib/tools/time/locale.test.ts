import { describe, expect, it } from 'vitest';
import { toIntlLocale } from './locale';

describe('toIntlLocale', () => {
  it('maps site locales to Intl locales', () => {
    expect(toIntlLocale('en')).toBe('en-US');
    expect(toIntlLocale('es')).toBe('es-CL');
    expect(toIntlLocale('pt-BR')).toBe('pt-BR');
  });
});
