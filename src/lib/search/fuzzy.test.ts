import { describe, expect, it } from 'vitest';
import { normalize, rankItems, scoreFields, scoreText } from './fuzzy';
import { searchTools } from './tools';

describe('normalize', () => {
  it('strips accents, lowercases and collapses spaces', () => {
    expect(normalize('  Árbol   Ñandú ')).toBe('arbol nandu');
  });
});

describe('scoreText', () => {
  it('returns 0 for an empty query', () => {
    expect(scoreText('', 'anything')).toBe(0);
    expect(scoreText('   ', 'anything')).toBe(0);
  });

  it('is accent and case insensitive', () => {
    expect(scoreText('árbol', 'Arbol')).toBe(scoreText('arbol', 'arbol'));
    expect(scoreText('ARBOL', 'árbol')).toBeGreaterThan(0);
  });

  it('ranks exact > prefix > word prefix > contains > subsequence', () => {
    const exact = scoreText('json', 'json');
    const prefix = scoreText('json', 'json prettier');
    const word = scoreText('pret', 'json prettier');
    const contains = scoreText('rett', 'json prettier');
    const scattered = scoreText('jsn', 'json prettier');
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(word);
    expect(word).toBeGreaterThan(contains);
    expect(contains).toBeGreaterThan(scattered);
    expect(scattered).toBeGreaterThan(0);
  });

  it('rejects subsequences that are too spread out', () => {
    expect(scoreText('jw', 'json prettier and more words here')).toBe(0);
    expect(scoreText('xyz', 'json')).toBe(0);
  });
});

describe('scoreFields', () => {
  it('applies weights', () => {
    const heavy = scoreFields('rut', [{ text: 'rut', weight: 3 }]);
    const light = scoreFields('rut', [{ text: 'rut', weight: 1 }]);
    expect(heavy).toBeGreaterThan(light);
  });

  it('requires every token of a multi-word query to match', () => {
    const fields = [
      { text: 'SQL IN (text)', weight: 3 },
      { text: 'quote', weight: 1 },
    ];
    expect(scoreFields('sql quote', fields)).toBeGreaterThan(0);
    expect(scoreFields('sql banana', fields)).toBe(0);
  });
});

describe('rankItems', () => {
  const items = ['beta', 'alpha', 'alphabet', 'gamma'];
  const fields = (item: string) => [{ text: item, weight: 1 }];

  it('returns nothing for an empty query', () => {
    expect(rankItems(items, '', fields, 10)).toEqual([]);
  });

  it('sorts by score and breaks ties by original order', () => {
    expect(rankItems(items, 'alpha', fields, 10)).toEqual(['alpha', 'alphabet']);
    expect(rankItems(['ab', 'xab', 'yab'], 'ab', fields, 10)).toEqual(['ab', 'xab', 'yab']);
    expect(rankItems(['x-a', 'y-a'], 'a', fields, 10)).toEqual(['x-a', 'y-a']);
  });

  it('respects the limit', () => {
    expect(rankItems(items, 'a', fields, 2)).toHaveLength(2);
  });
});

describe('searchTools', () => {
  const slugs = (query: string, locale: 'en' | 'es' = 'en') =>
    searchTools(query, locale).map((tool) => tool.slug);

  it('finds CPF and CNPJ by the "brasil" keyword', () => {
    expect(slugs('brasil').slice(0, 2).sort()).toEqual(['cnpj', 'cpf']);
  });

  it('ranks CPF first for "cpf"', () => {
    expect(slugs('cpf')[0]).toBe('cpf');
  });

  it('finds the timezone tool via its Spanish name', () => {
    expect(slugs('zona', 'en')).toContain('timezone');
    expect(slugs('zona', 'es')[0]).toBe('timezone');
  });

  it('still matches JSON prettier for "jsn"', () => {
    expect(slugs('jsn')[0]).toBe('json');
  });

  it('treats accents as equal', () => {
    expect(slugs('números', 'es')).toEqual(slugs('numeros', 'es'));
    expect(slugs('numeros', 'es')[0]).toBe('sql-in-numbers');
  });

  it('matches category labels', () => {
    expect(slugs('tiempo', 'es')).toEqual(expect.arrayContaining(['timezone', 'unix']));
  });
});
