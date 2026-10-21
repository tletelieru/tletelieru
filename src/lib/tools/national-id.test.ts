import { describe, expect, it } from 'vitest';
import { nonEmptyLines } from './_shared/lines';
import {
  countries,
  documents,
  documentsOf,
  generateDocuments,
  resolveDocument,
} from './national-id';

describe('national-id registry', () => {
  it('has unique ids and at least one document per country', () => {
    expect(new Set(documents.map((document) => document.id)).size).toBe(documents.length);
    for (const country of countries) expect(documentsOf(country.id).length).toBeGreaterThan(0);
  });

  it.each(documents.map((document) => [document.id, document] as const))(
    '%s accepts its placeholder examples',
    (_, document) => {
      for (const line of nonEmptyLines(document.placeholder)) {
        expect(document.validate(line).valid).toBe(true);
      }
    },
  );

  it.each(documents.map((document) => [document.id, document] as const))(
    '%s round-trips generated values through validate and format',
    (_, document) => {
      for (const value of generateDocuments(document, 50)) {
        expect(document.validate(value).valid).toBe(true);
        const masked = document.format(value, 'full');
        expect(masked).not.toBeNull();
        expect(document.validate(masked ?? '').valid).toBe(true);
        expect(document.format(masked ?? '', 'plain')).toBe(document.format(value, 'plain'));
      }
    },
  );

  it('resolves documents by country with fallbacks', () => {
    expect(resolveDocument('pe', 'pe-ruc').id).toBe('pe-ruc');
    expect(resolveDocument('pe', 'ar-cuit').id).toBe('pe-dni');
    expect(resolveDocument('zz', 'whatever').id).toBe('ar-dni');
  });

  it('generates deterministically with an injected random source', () => {
    const document = resolveDocument('ar', 'ar-dni');
    expect(generateDocuments(document, 2, () => 0)).toEqual(['10000000', '10000000']);
  });
});
