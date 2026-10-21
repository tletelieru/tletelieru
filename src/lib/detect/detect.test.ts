import { describe, expect, it } from 'vitest';
import { computeCuitDv } from '../tools/ids/argentina';
import { tools } from '../tools/registry';
import { computeRutDv } from '../tools/rut';
import { detectInput, MAX_DETECT_LENGTH } from './index';
import {
  detectCase,
  detectCnpj,
  detectCpf,
  detectDateTime,
  detectHtml,
  detectJson,
  detectLists,
  detectNationalId,
  detectRut,
  detectUnix,
  isIdentifier,
  type DetectContext,
} from './detectors';
import { splitValues } from '../tools/sql/values';

function ctx(text: string): DetectContext {
  const trimmed = text.trim();
  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return { text, trimmed, lines, values: splitValues(trimmed), large: false };
}

function top(text: string) {
  return detectInput(text)[0];
}

function confidenceOf(text: string, slug: string): number {
  return detectInput(text).find((item) => item.slug === slug)?.confidence ?? 0;
}

const cuit = `20-12345678-${computeCuitDv('2012345678')}`;

describe('detectRut', () => {
  it('detects a valid formatted RUT with high confidence', () => {
    const [detection] = detectRut(ctx('12.345.678-5'));
    expect(detection.slug).toBe('rut');
    expect(detection.confidence).toBeGreaterThan(0.9);
    expect(detection.params).toEqual({ input: '12.345.678-5', mode: 'validate' });
  });

  it('detects one RUT per line', () => {
    const text = `12.345.678-5\n10.000.013-K\n7654321-${computeRutDv('7654321')}`;
    expect(detectRut(ctx(text))[0].confidence).toBeGreaterThan(0.9);
  });

  it('gives low confidence to formatted RUTs with a wrong check digit', () => {
    expect(detectRut(ctx('12.345.678-9'))[0].confidence).toBeLessThan(0.5);
  });

  it('ignores non RUT input', () => {
    expect(detectRut(ctx('hello world'))).toEqual([]);
    expect(detectRut(ctx('12.345.678-5\nfoo'))).toEqual([]);
  });
});

describe('detectCpf', () => {
  it('detects masked and plain valid CPFs', () => {
    expect(detectCpf(ctx('123.456.789-09'))[0].confidence).toBeGreaterThan(0.9);
    expect(detectCpf(ctx('12345678909'))[0].confidence).toBeGreaterThan(0.6);
  });

  it('ignores plain invalid numbers', () => {
    expect(detectCpf(ctx('12345678900'))).toEqual([]);
    expect(detectCpf(ctx('abc'))).toEqual([]);
  });
});

describe('detectCnpj', () => {
  it('detects numeric and alphanumeric CNPJs', () => {
    expect(detectCnpj(ctx('11.222.333/0001-81'))[0].confidence).toBeGreaterThan(0.9);
    expect(detectCnpj(ctx('12.ABC.345/01DE-35'))[0].confidence).toBeGreaterThan(0.9);
    expect(detectCnpj(ctx('11222333000181'))[0].confidence).toBeGreaterThan(0.7);
  });

  it('ignores invalid plain values', () => {
    expect(detectCnpj(ctx('11222333000182'))).toEqual([]);
  });

  it('ranks CNPJ first for a masked CNPJ', () => {
    expect(top('11.222.333/0001-81').slug).toBe('cnpj');
  });
});

describe('detectNationalId', () => {
  it('detects a valid CUIT', () => {
    const [detection] = detectNationalId(ctx(cuit));
    expect(detection.params).toMatchObject({ country: 'ar', doc: 'ar-cuit', mode: 'validate' });
    expect(detection.confidence).toBeGreaterThan(0.8);
  });

  it('detects a valid CURP', () => {
    const [detection] = detectNationalId(ctx('BOXW310820HNERXN09'));
    expect(detection.params).toMatchObject({ country: 'mx', doc: 'mx-curp' });
  });

  it('detects Spanish DNI and NIE only with a valid letter', () => {
    expect(detectNationalId(ctx('12345678Z'))[0].params.doc).toBe('es-dni');
    expect(detectNationalId(ctx('X1234567L'))[0].params.doc).toBe('es-nie');
    expect(detectNationalId(ctx('12345678A'))).toEqual([]);
  });
});

describe('detectJson', () => {
  it('detects valid JSON objects and arrays', () => {
    expect(detectJson(ctx('{"a": 1}'))[0]).toEqual({
      slug: 'json',
      confidence: 0.95,
      params: { input: '{"a": 1}' },
    });
    expect(detectJson(ctx('[1, 2]'))[0].confidence).toBe(0.95);
  });

  it('opens broken JSON in validate mode with lower confidence', () => {
    const [detection] = detectJson(ctx('{"a": 1,}'));
    expect(detection.confidence).toBeLessThan(0.6);
    expect(detection.params.mode).toBe('validate');
  });

  it('ignores non containers', () => {
    expect(detectJson(ctx('"text"'))).toEqual([]);
    expect(detectJson(ctx('{ unbalanced'))).toEqual([]);
  });
});

describe('detectHtml', () => {
  it('detects markup', () => {
    expect(detectHtml(ctx('<div class="a">Hi</div>'))[0].confidence).toBe(0.9);
    expect(detectHtml(ctx('<!DOCTYPE html><html></html>'))[0].confidence).toBe(0.9);
    expect(detectHtml(ctx('<br>'))[0].confidence).toBe(0.6);
  });

  it('ignores text that is not markup', () => {
    expect(detectHtml(ctx('a < b'))).toEqual([]);
    expect(detectHtml(ctx('< 3 apples'))).toEqual([]);
  });
});

describe('detectUnix', () => {
  it('detects seconds, milliseconds and lists', () => {
    expect(detectUnix(ctx('1700000000'))[0].confidence).toBe(0.9);
    expect(detectUnix(ctx('1700000000000'))[0].slug).toBe('unix');
    expect(detectUnix(ctx('1700000000\n1700000500'))[0].confidence).toBe(0.85);
  });

  it('ignores other numbers', () => {
    expect(detectUnix(ctx('12345'))).toEqual([]);
    expect(detectUnix(ctx('1700000000\nabc'))).toEqual([]);
  });

  it('ranks unix above SQL IN for timestamp lists', () => {
    expect(top('1700000000\n1700000500').slug).toBe('unix');
  });
});

describe('detectDateTime', () => {
  it('sends date-times to the timezone tool first', () => {
    const detections = detectDateTime(ctx('2024-03-10 14:30'));
    expect(detections.map((item) => item.slug)).toEqual(['timezone', 'unix']);
    expect(detections[0].confidence).toBeGreaterThan(0.8);
    expect(top('2024-03-10T14:30:00Z').slug).toBe('timezone');
  });

  it('gives date-only input a lower confidence', () => {
    expect(detectDateTime(ctx('2024-03-10'))[0].confidence).toBe(0.5);
  });

  it('rejects invalid dates', () => {
    expect(detectDateTime(ctx('2024-13-40 10:00'))).toEqual([]);
    expect(detectDateTime(ctx('2024-03-10\n2024-03-11'))).toEqual([]);
  });
});

describe('detectLists', () => {
  it('detects integer lists for SQL IN (numbers)', () => {
    const detections = detectLists(ctx('1\n2\n3'));
    expect(detections[0]).toMatchObject({ slug: 'sql-in-numbers', confidence: 0.6 });
    expect(detections[1].slug).toBe('sql-in-text');
    expect(detectLists(ctx('1, 2, 3'))[0].slug).toBe('sql-in-numbers');
  });

  it('detects UUIDs and codes for SQL IN (text)', () => {
    const uuids = '550e8400-e29b-41d4-a716-446655440000\n6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    expect(detectLists(ctx(uuids))[0]).toMatchObject({ slug: 'sql-in-text', confidence: 0.65 });
    expect(detectLists(ctx('ABC-1\nXYZ-2'))[0].confidence).toBe(0.4);
  });

  it('ignores single values, short comma pairs and prose lines', () => {
    expect(detectLists(ctx('ABC-1'))).toEqual([]);
    expect(detectLists(ctx('hello, world'))).toEqual([]);
    expect(detectLists(ctx('first line of text\nsecond line of text'))).toEqual([]);
  });
});

describe('detectCase', () => {
  it('recognizes identifiers', () => {
    for (const value of [
      'someVariableName',
      'some_variable',
      'SOME_CONSTANT',
      'kebab-case',
      'PascalCase',
    ]) {
      expect(isIdentifier(value)).toBe(true);
    }
    for (const value of ['hello', 'Hello world', '550e8400-e29b', '123_abc']) {
      expect(isIdentifier(value)).toBe(false);
    }
  });

  it('detects single and multi-line identifiers', () => {
    expect(detectCase(ctx('someVariableName'))[0]).toMatchObject({ slug: 'case', confidence: 0.7 });
    expect(detectCase(ctx('some_var\notherVar'))[0].confidence).toBe(0.5);
  });
});

describe('detectInput', () => {
  it('returns nothing for empty input', () => {
    expect(detectInput('')).toEqual([]);
    expect(detectInput('   \n ')).toEqual([]);
  });

  it('returns nothing (or very low) for prose', () => {
    const prose = 'The quick brown fox jumps over the lazy dog.\nIt was a sunny day, really.';
    expect(detectInput(prose).every((item) => item.confidence < 0.3)).toBe(true);
    expect(detectInput('hello there')).toEqual([]);
  });

  it('ranks a valid RUT first', () => {
    expect(top('12.345.678-5')).toEqual({
      slug: 'rut',
      confidence: 0.95,
      params: { input: '12.345.678-5', mode: 'validate' },
    });
  });

  it('sorts by confidence and only returns registered tools', () => {
    const detections = detectInput('1\n2\n3');
    const confidences = detections.map((item) => item.confidence);
    expect(confidences).toEqual([...confidences].sort((a, b) => b - a));
    const slugs = new Set(tools.map((tool) => tool.slug));
    for (const item of detections) expect(slugs.has(item.slug)).toBe(true);
  });

  it('keeps the best detection per slug', () => {
    const slugs = detectInput('1700000000').map((item) => item.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('detects CUIT ahead of other tools', () => {
    expect(top(cuit).slug).toBe('national-id');
  });

  it('only runs cheap JSON/HTML checks on large input', () => {
    const big = `[${'1,'.repeat(MAX_DETECT_LENGTH)}1]`;
    expect(detectInput(big)).toEqual([{ slug: 'json', confidence: 0.6, params: { input: big } }]);
    const bigText = '1\n'.repeat(MAX_DETECT_LENGTH);
    expect(detectInput(bigText)).toEqual([]);
    expect(confidenceOf(`<div>${'a'.repeat(MAX_DETECT_LENGTH)}</div>`, 'html')).toBe(0.9);
  });

  it('never throws on odd input', () => {
    expect(() => detectInput('\u0000￿{[<')).not.toThrow();
    expect(() => detectInput(undefined as unknown as string)).not.toThrow();
  });
});
