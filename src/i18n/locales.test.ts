import { describe, expect, it } from 'vitest';
import { isLocale, pickLocale, toLocale } from './locales';

describe('toLocale', () => {
  it.each([
    ['es', 'es'],
    ['es-CL', 'es'],
    ['EN-us', 'en'],
    ['pt-BR', 'en'],
    [undefined, 'en'],
  ])('maps %s to %s', (input, expected) => {
    expect(toLocale(input)).toBe(expected);
  });
});

describe('pickLocale', () => {
  it('prefers the saved choice', () => {
    expect(pickLocale('es', ['en-US'])).toBe('es');
  });

  it('uses the first supported browser language', () => {
    expect(pickLocale(null, ['pt-BR', 'es-CL', 'en-US'])).toBe('es');
    expect(pickLocale(null, ['fr-FR', 'en-GB'])).toBe('en');
  });

  it('ignores invalid saved values and falls back to English', () => {
    expect(pickLocale('fr', ['de-DE'])).toBe('en');
  });
});

describe('isLocale', () => {
  it('only accepts supported locales', () => {
    expect(isLocale('es')).toBe(true);
    expect(isLocale('es-CL')).toBe(false);
    expect(isLocale(3)).toBe(false);
  });
});
