import { describe, expect, it } from 'vitest';
import { computeCuitDv } from '../tools/ids/argentina';
import { tools } from '../tools/registry';
import { computeRutDv } from '../tools/rut';
import { detectInput, MAX_DETECT_LENGTH } from './index';
import {
  detectBase64,
  detectHash,
  detectHtmlEntities,
  detectJsonEscape,
  detectJwt,
  detectUrl,
  detectUuid,
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

const jwt =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
const uuid = '550e8400-e29b-41d4-a716-446655440000';
const ulid = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
const md5 = 'd41d8cd98f00b204e9800998ecf8427e';
const sha1 = 'da39a3ee5e6b4b0d3255bfef95601890afd80709';
const sha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const anyTool = () => true;

function topAny(text: string) {
  return detectInput(text, anyTool)[0];
}

function slugsAny(text: string): string[] {
  return detectInput(text, anyTool).map((item) => item.slug);
}

describe('detectJwt', () => {
  it('detects a JWT, strips a Bearer prefix and marks it sensitive', () => {
    expect(detectJwt(ctx(jwt))).toEqual([
      { slug: 'jwt', confidence: 0.97, params: { input: jwt }, sensitive: true },
    ]);
    expect(detectJwt(ctx(`Bearer ${jwt}`))[0]?.params).toEqual({ input: jwt });
  });

  it('ignores dotted text whose header is not JSON with alg', () => {
    expect(detectJwt(ctx('www.example.com'))).toEqual([]);
    expect(detectJwt(ctx('eyJ0eXAiOiJKV1QifQ.e30.sig'))).toEqual([]);
    expect(detectJwt(ctx('a.b.c'))).toEqual([]);
    expect(detectJwt(ctx(`${jwt}\n${jwt}`))).toEqual([]);
  });

  it('ranks the JWT first and never as Base64', () => {
    expect(topAny(jwt).slug).toBe('jwt');
    expect(slugsAny(jwt)).not.toContain('base64');
  });
});

describe('detectUuid', () => {
  it('detects single UUIDs and ULIDs in inspect mode', () => {
    expect(detectUuid(ctx(uuid))).toEqual([
      { slug: 'uuid', confidence: 0.9, params: { mode: 'inspect', input: uuid } },
    ]);
    expect(detectUuid(ctx(`{${uuid.toUpperCase()}}`))[0]?.confidence).toBe(0.9);
    expect(detectUuid(ctx(ulid))[0]?.slug).toBe('uuid');
  });

  it('detects lists below a single value', () => {
    const list = `${uuid}\n6ba7b810-9dad-11d1-80b4-00c04fd430c8\n${ulid}`;
    expect(detectUuid(ctx(list))[0]?.confidence).toBe(0.75);
    expect(topAny(list).slug).toBe('uuid');
  });

  it('ignores near misses', () => {
    expect(detectUuid(ctx('550e8400-e29b-41d4-a716-44665544000'))).toEqual([]);
    expect(detectUuid(ctx(`${uuid}\nhello`))).toEqual([]);
    expect(detectUuid(ctx('ABCDEFGHJKMNPQRSTVWXYZABCD'))).toEqual([]);
    expect(detectUuid(ctx('81ARZ3NDEKTSV4RRFFQ69G5FAV'))).toEqual([]);
  });
});

describe('detectBase64', () => {
  it('detects padded Base64 text in decode mode', () => {
    const text = 'SGVsbG8sIFdvcmxkISBUaGlzIGlzIGJhc2U2NC4=';
    expect(detectBase64(ctx(text))).toEqual([
      { slug: 'base64', confidence: 0.75, params: { mode: 'decode', input: text } },
    ]);
    expect(topAny(text).slug).toBe('base64');
  });

  it('prefers Base64 that decodes to JSON', () => {
    expect(detectBase64(ctx('eyJhIjoxLCJiIjoieCJ9'))[0]?.confidence).toBe(0.85);
  });

  it('accepts wrapped lines of equal width', () => {
    const encoded =
      'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhIHdyYXBwZWQgdGV4dCB0aGF0IGlzIGxvbmcgZW5vdWdoIHRvIG5lZWQgdHdvIGxpbmVzIG9mIGJhc2U2NCBvdXRwdXQgb2s=';
    const wrapped = encoded.match(/.{1,76}/g)?.join('\n') ?? '';
    expect(detectBase64(ctx(wrapped))[0]?.slug).toBe('base64');
  });

  it('avoids words, identifiers, hex, numbers and binary', () => {
    for (const value of [
      'hello',
      'someVariableNameX',
      'SomeLongPascalCaseName',
      md5,
      sha256,
      '12345678901234567890',
      uuid,
      'aGk/Pj4/',
      '/w==/w==/w==/w==',
      'Administrator1234',
      'abc$defghijklmnopq',
    ]) {
      expect(detectBase64(ctx(value))).toEqual([]);
    }
  });
});

describe('detectUrl', () => {
  it('detects http(s) URLs in parse mode', () => {
    const url = 'https://example.com/path?q=1&lang=es#top';
    expect(detectUrl(ctx(url))).toEqual([
      { slug: 'url', confidence: 0.9, params: { mode: 'parse', input: url } },
    ]);
    expect(topAny(url).slug).toBe('url');
  });

  it('detects query strings at a lower confidence', () => {
    expect(detectUrl(ctx('?a=1&b=two'))[0]?.confidence).toBe(0.7);
    expect(detectUrl(ctx('utm_source=x&utm_medium=email&id=%20a'))[0]?.slug).toBe('url');
    expect(detectUrl(ctx('?q=hello'))[0]?.slug).toBe('url');
  });

  it('ignores other text', () => {
    expect(detectUrl(ctx('a=1'))).toEqual([]);
    expect(detectUrl(ctx('ftp://example.com'))).toEqual([]);
    expect(detectUrl(ctx('https://'))).toEqual([]);
    expect(detectUrl(ctx('see https://example.com for more'))).toEqual([]);
    expect(detectUrl(ctx('https://a.com\nhttps://b.com'))).toEqual([]);
  });
});

describe('detectHtmlEntities', () => {
  it('detects named and numeric entities in decode mode', () => {
    expect(detectHtmlEntities(ctx('Tom &amp; Jerry'))).toEqual([
      {
        slug: 'html-entities',
        confidence: 0.7,
        params: { mode: 'decode', input: 'Tom &amp; Jerry' },
      },
    ]);
    expect(detectHtmlEntities(ctx('caf&eacute; &#233; &#xE9;'))[0]?.confidence).toBe(0.8);
    expect(topAny('caf&eacute; &#233;').slug).toBe('html-entities');
  });

  it('ignores bare ampersands and unknown names', () => {
    expect(detectHtmlEntities(ctx('Tom & Jerry'))).toEqual([]);
    expect(detectHtmlEntities(ctx('a=1&b=2'))).toEqual([]);
    expect(detectHtmlEntities(ctx('&foo; &bar;'))).toEqual([]);
  });

  it('keeps HTML markup ahead of entities', () => {
    expect(topAny('<p>Tom &amp; Jerry</p>').slug).toBe('html');
  });
});

describe('detectJsonEscape', () => {
  it('detects quoted JSON strings with high confidence', () => {
    const text = String.raw`"{\"a\":1}"`;
    expect(detectJsonEscape(ctx(text))).toEqual([
      { slug: 'json-escape', confidence: 0.85, params: { mode: 'unescape', input: text } },
    ]);
    expect(topAny(text).slug).toBe('json-escape');
  });

  it('scores unquoted escapes by strength', () => {
    expect(detectJsonEscape(ctx(String.raw`caf\u00e9 \"x\"`))[0]?.confidence).toBe(0.7);
    expect(detectJsonEscape(ctx(String.raw`line 1\nline 2`))[0]?.confidence).toBe(0.45);
  });

  it('ignores valid JSON, Windows paths, invalid escapes and plain text', () => {
    expect(detectJsonEscape(ctx(String.raw`{"a":"x\ny"}`))).toEqual([]);
    expect(detectJsonEscape(ctx(String.raw`C:\new\temp`))).toEqual([]);
    expect(detectJsonEscape(ctx(String.raw`bad \x escape \n`))).toEqual([]);
    expect(detectJsonEscape(ctx(String.raw`lone \ud83d`))).toEqual([]);
    expect(detectJsonEscape(ctx('"plain"'))).toEqual([]);
    expect(topAny(String.raw`{"a":"x\ny"}`).slug).toBe('json');
  });
});

describe('detectHash', () => {
  it('detects MD5, SHA-1 and SHA-256 digests at low confidence', () => {
    for (const digest of [md5, sha1, sha256, sha256.toUpperCase()]) {
      expect(detectHash(ctx(digest))).toEqual([
        { slug: 'hash', confidence: 0.35, params: { mode: 'verify', expected: digest } },
      ]);
    }
    expect(topAny(md5).slug).toBe('hash');
  });

  it('ignores other lengths and non-hex', () => {
    expect(detectHash(ctx(md5.slice(1)))).toEqual([]);
    expect(detectHash(ctx(`${md5.slice(1)}g`))).toEqual([]);
    expect(detectHash(ctx(`${md5}\n${md5}`))).toEqual([]);
  });
});

describe('detectInput with M3 tools', () => {
  it('keeps existing rankings', () => {
    expect(topAny('12.345.678-5').slug).toBe('rut');
    expect(topAny('{"a": 1}').slug).toBe('json');
    expect(topAny('1700000000').slug).toBe('unix');
    expect(topAny('someVariableName').slug).toBe('case');
    expect(topAny('2024-03-10T14:30:00Z').slug).toBe('timezone');
    expect(topAny('1\n2\n3').slug).toBe('sql-in-numbers');
  });

  it('filters unregistered slugs by default', () => {
    const registered = new Set(tools.map((tool) => tool.slug));
    for (const item of detectInput(jwt)) expect(registered.has(item.slug)).toBe(true);
  });

  it('stays quiet for prose', () => {
    const prose = 'The quick brown fox jumps over the lazy dog.\nIt was a sunny day, really.';
    expect(detectInput(prose, anyTool).every((item) => item.confidence < 0.3)).toBe(true);
    expect(detectInput('hello there', anyTool)).toEqual([]);
  });
});
