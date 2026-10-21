import { describe, expect, it } from 'vitest';
import {
  decodeInput,
  decodeToBytes,
  decodeToText,
  encodeBytes,
  encodeText,
  fileNameFor,
  splitDataUri,
  toDataUri,
  utf8Length,
  wrapLines,
} from './base64';

describe('encodeText', () => {
  it.each([
    ['', ''],
    ['f', 'Zg=='],
    ['fo', 'Zm8='],
    ['foo', 'Zm9v'],
    ['foobar', 'Zm9vYmFy'],
    ['ñandú ✓', 'w7FhbmTDuiDinJM='],
    ['😀', '8J+YgA=='],
  ])('encodes %j as UTF-8', (text, expected) => {
    expect(encodeText(text)).toBe(expected);
  });

  it('matches btoa for every byte value', () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, index) => index);
    expect(encodeBytes(bytes)).toBe(btoa(String.fromCharCode(...bytes)));
  });

  it('uses the URL-safe alphabet and drops padding on request', () => {
    const bytes = Uint8Array.from([0xfb, 0xff, 0xbf, 0xfe]);
    expect(encodeBytes(bytes)).toBe('+/+//g==');
    expect(encodeBytes(bytes, { alphabet: 'url' })).toBe('-_-__g==');
    expect(encodeBytes(bytes, { alphabet: 'url', padding: false })).toBe('-_-__g');
  });

  it('wraps at 76 characters with CRLF for MIME', () => {
    const encoded = encodeText('a'.repeat(100), { wrap: true });
    const lines = encoded.split('\r\n');
    expect(lines.map((line) => line.length)).toEqual([76, 60]);
    expect(wrapLines('abc')).toBe('abc');
  });
});

describe('decodeToBytes', () => {
  it('round trips every byte value', () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, index) => 255 - index);
    const result = decodeToBytes(encodeBytes(bytes, { wrap: true }));
    expect(result.ok && Array.from(result.bytes)).toEqual(Array.from(bytes));
  });

  it('tolerates whitespace, missing padding and either alphabet', () => {
    expect(decodeToText(' Zm9v\n YmE ')).toEqual({ ok: true, text: 'fooba' });
    expect(decodeToText('Zg')).toEqual({ ok: true, text: 'f' });
    expect(decodeToText('w7FhbmTDuiDinJM')).toEqual({ ok: true, text: 'ñandú ✓' });
    const result = decodeToBytes('-_-__g');
    expect(result.ok && Array.from(result.bytes)).toEqual([0xfb, 0xff, 0xbf, 0xfe]);
  });

  it('reports the first invalid character with its position', () => {
    expect(decodeToBytes('Zm9v*YmFy')).toEqual({
      ok: false,
      error: { code: 'invalidChar', position: 4, char: '*' },
    });
    expect(decodeToBytes('Zg==Zg')).toEqual({
      ok: false,
      error: { code: 'invalidChar', position: 4, char: 'Z' },
    });
  });

  it('reports an impossible length', () => {
    expect(decodeToBytes('Zm9vY')).toEqual({ ok: false, error: { code: 'length' } });
  });

  it('reports bytes that are not UTF-8 text', () => {
    expect(decodeToText('/w==')).toEqual({ ok: false, error: { code: 'utf8' } });
  });
});

describe('data URIs', () => {
  it('builds a data URI', () => {
    expect(toDataUri('Zm9v', 'text/plain')).toBe('data:text/plain;base64,Zm9v');
    expect(toDataUri('Zm9v\r\nYmFy', '')).toBe('data:application/octet-stream;base64,Zm9vYmFy');
  });

  it('splits a data URI into mime and payload', () => {
    expect(splitDataUri('data:image/png;charset=x;base64,iVBO')).toEqual({
      mime: 'image/png',
      payload: 'iVBO',
      offset: 32,
    });
    expect(splitDataUri('Zm9v')).toEqual({ mime: null, payload: 'Zm9v', offset: 0 });
  });

  it('decodes data URIs and offsets error positions', () => {
    const ok = decodeInput('data:text/plain;base64,Zm9v');
    expect(ok.ok && ok.mime).toBe('text/plain');
    expect(decodeInput('data:text/plain;base64,Zm*v')).toEqual({
      ok: false,
      error: { code: 'invalidChar', position: 25, char: '*' },
      mime: 'text/plain',
    });
  });
});

describe('helpers', () => {
  it('counts UTF-8 bytes', () => {
    expect(utf8Length('ñ✓😀')).toBe(9);
  });

  it('picks a file name from the mime type', () => {
    expect(fileNameFor('image/png')).toBe('decoded.png');
    expect(fileNameFor(null)).toBe('decoded.bin');
    expect(fileNameFor('application/x-unknown', 'file')).toBe('file.bin');
  });
});
