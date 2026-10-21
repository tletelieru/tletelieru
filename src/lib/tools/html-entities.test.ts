import { describe, expect, it } from 'vitest';
import {
  countKnownEntities,
  decodeHtmlEntities,
  encodeHtmlEntities,
  htmlEntityTable,
  isHtmlEncodeFormat,
  isHtmlEncodeScope,
} from './html-entities';

describe('encodeHtmlEntities', () => {
  it('escapes only the five special characters by default', () => {
    expect(encodeHtmlEntities(`<a href="x">Tom & Jerry's</a> café`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt; café',
    );
  });

  it('uses numeric references for the minimal set when asked', () => {
    expect(encodeHtmlEntities(`<&>"'`, { format: 'decimal' })).toBe('&#60;&#38;&#62;&#34;&#39;');
    expect(encodeHtmlEntities(`<&>"'`, { format: 'hex' })).toBe('&#x3C;&#x26;&#x3E;&#x22;&#x27;');
  });

  it('encodes non-ASCII with names where they exist and numbers otherwise', () => {
    expect(encodeHtmlEntities('café © — … € ñ 中', { scope: 'non-ascii', format: 'named' })).toBe(
      'caf&eacute; &copy; &mdash; &hellip; &euro; &ntilde; &#20013;',
    );
    expect(encodeHtmlEntities(' ', { scope: 'non-ascii' })).toBe('&nbsp;');
  });

  it('encodes astral code points as a single reference', () => {
    expect(encodeHtmlEntities('😀', { scope: 'non-ascii' })).toBe('&#128512;');
    expect(encodeHtmlEntities('😀', { scope: 'non-ascii', format: 'hex' })).toBe('&#x1F600;');
    expect(encodeHtmlEntities('é😀', { scope: 'non-ascii', format: 'decimal' })).toBe(
      '&#233;&#128512;',
    );
  });

  it('leaves non-ASCII untouched in minimal scope', () => {
    expect(encodeHtmlEntities('😀 ñ')).toBe('😀 ñ');
  });

  it('double-encodes existing entities', () => {
    expect(encodeHtmlEntities('&amp;')).toBe('&amp;amp;');
  });
});

describe('decodeHtmlEntities', () => {
  it('decodes named, decimal and hex references', () => {
    expect(decodeHtmlEntities('caf&eacute; &#233; &#xE9; &#Xe9; &copy; &hellip;')).toEqual({
      output: 'café é é é © …',
      decoded: 6,
      issues: [],
    });
  });

  it('decodes astral code points', () => {
    expect(decodeHtmlEntities('&#128512; &#x1F600;').output).toBe('😀 😀');
  });

  it('decodes only one level of double encoding', () => {
    expect(decodeHtmlEntities('&amp;amp;').output).toBe('&amp;');
    expect(decodeHtmlEntities(decodeHtmlEntities('&amp;amp;').output).output).toBe('&');
  });

  it('reports unknown entities with their positions and keeps them', () => {
    const result = decodeHtmlEntities('a &foo; b &bar;');
    expect(result.output).toBe('a &foo; b &bar;');
    expect(result.issues).toEqual([
      { code: 'unknown-entity', entity: '&foo;', offset: 2 },
      { code: 'unknown-entity', entity: '&bar;', offset: 10 },
    ]);
  });

  it('tolerates a missing semicolon on legacy names and numeric references', () => {
    const result = decodeHtmlEntities('&copy 2024 &amp &#233 x');
    expect(result.output).toBe('© 2024 & é x');
    expect(result.issues.map((issue) => [issue.code, issue.entity, issue.offset])).toEqual([
      ['missing-semicolon', '&copy', 0],
      ['missing-semicolon', '&amp', 11],
      ['missing-semicolon', '&#233', 16],
    ]);
  });

  it('does not accept non-legacy names without a semicolon', () => {
    expect(decodeHtmlEntities('&hellip').output).toBe('&hellip');
  });

  it('replaces invalid code points', () => {
    const result = decodeHtmlEntities('&#0; &#xD800; &#x110000;');
    expect(result.output).toBe('� � �');
    expect(result.issues.every((issue) => issue.code === 'invalid-code-point')).toBe(true);
  });

  it('leaves lone ampersands alone', () => {
    expect(decodeHtmlEntities('a & b && c &')).toEqual({
      output: 'a & b && c &',
      decoded: 0,
      issues: [],
    });
  });
});

describe('round trips', () => {
  const samples = [
    `<p class="x">Tom & Jerry's "café" — 😀 ñ 中 &amp;</p>`,
    'plain ascii',
    ' © ® ™ « » € …',
  ];

  it.each(samples)('decode(encode(%s)) is identity', (sample) => {
    for (const scope of ['minimal', 'non-ascii'] as const) {
      for (const format of ['named', 'decimal', 'hex'] as const) {
        const encoded = encodeHtmlEntities(sample, { scope, format });
        expect(decodeHtmlEntities(encoded)).toMatchObject({ output: sample, issues: [] });
      }
    }
  });

  it('every table entry decodes to its code point', () => {
    for (const [name, code] of htmlEntityTable) {
      expect(decodeHtmlEntities(`&${name};`).output).toBe(String.fromCodePoint(code));
    }
  });
});

describe('helpers', () => {
  it('validates option values', () => {
    expect(isHtmlEncodeScope('non-ascii')).toBe(true);
    expect(isHtmlEncodeScope('all')).toBe(false);
    expect(isHtmlEncodeFormat('hex')).toBe(true);
    expect(isHtmlEncodeFormat(1)).toBe(false);
  });

  it('counts known entities only', () => {
    expect(countKnownEntities('a &amp; b &#233; &#x41; &foo; & c')).toBe(3);
    expect(countKnownEntities('nothing here')).toBe(0);
  });
});
