import { describe, expect, it } from 'vitest';
import { convertCurl, parseCurl, pyLiteral, tokenizeShell, type CurlRequest } from './curl';

function request(input: string): CurlRequest {
  const result = parseCurl(input);
  if (!result.ok) throw new Error(result.error.code);
  return result.request;
}

describe('tokenizeShell', () => {
  it('handles quotes, escapes and line continuations', () => {
    expect(tokenizeShell(`curl 'a b' "c \\"d\\"" e\\ f \\\n  $'g\\nh'`)).toEqual({
      ok: true,
      tokens: ['curl', 'a b', 'c "d"', 'e f', 'g\nh'],
    });
  });

  it('reports unterminated quotes', () => {
    expect(tokenizeShell(`curl 'open`)).toEqual({ ok: false, quote: "'" });
  });
});

describe('parseCurl', () => {
  it('parses method, headers, body and flags', () => {
    expect(
      request(
        `curl -X put https://api.example.com/items -H 'Accept: application/json' -d 'a=1' --compressed -k -L`,
      ),
    ).toEqual({
      method: 'PUT',
      url: 'https://api.example.com/items',
      headers: [
        ['Accept', 'application/json'],
        ['Content-Type', 'application/x-www-form-urlencoded'],
      ],
      body: 'a=1',
      form: [],
      user: null,
      compressed: true,
      insecure: true,
      followRedirects: true,
      ignored: [],
    });
  });

  it('defaults to POST with data and GET without', () => {
    expect(request('curl https://x.io -d x').method).toBe('POST');
    expect(request('curl x.io').method).toBe('GET');
    expect(request('curl x.io').url).toBe('http://x.io/');
    expect(request('curl -I https://x.io').method).toBe('HEAD');
  });

  it('joins several data flags and urlencodes values', () => {
    expect(request(`curl https://x.io --data-raw a=1 --data-urlencode 'q=hello world'`).body).toBe(
      'a=1&q=hello%20world',
    );
  });

  it('moves data into the query with -G', () => {
    expect(request('curl -G https://x.io/s?a=1 -d b=2').url).toBe('https://x.io/s?a=1&b=2');
  });

  it('parses multipart form fields and files', () => {
    expect(request(`curl -F 'file=@photo.png' -F name=x https://x.io`).form).toEqual([
      { name: 'file', value: 'photo.png', file: true },
      { name: 'name', value: 'x', file: false },
    ]);
  });

  it('supports --flag=value, combined switches and --json', () => {
    const parsed = request(`curl -sSL --url=https://x.io --json '{"a":1}'`);
    expect(parsed.url).toBe('https://x.io/');
    expect(parsed.followRedirects).toBe(true);
    expect(parsed.headers).toContainEqual(['Content-Type', 'application/json']);
  });

  it('reports errors', () => {
    expect(parseCurl('')).toEqual({ ok: false, error: { code: 'empty' } });
    expect(parseCurl('wget x')).toEqual({ ok: false, error: { code: 'notCurl' } });
    expect(parseCurl('curl -H')).toEqual({
      ok: false,
      error: { code: 'missingValue', flag: '-H' },
    });
    expect(parseCurl('curl -s')).toEqual({ ok: false, error: { code: 'missingUrl' } });
    expect(parseCurl('curl http://[bad')).toEqual({
      ok: false,
      error: { code: 'invalidUrl', url: 'http://[bad' },
    });
  });
});

const json = request(
  `curl https://api.example.com/v1 -H 'Content-Type: application/json' -d '{"name":"a","ok":true,"n":null}' -u user:pass`,
);

describe('convertCurl', () => {
  it('generates fetch', () => {
    expect(convertCurl(json, 'fetch')).toBe(
      [
        'const response = await fetch("https://api.example.com/v1", {',
        '  method: "POST",',
        '  headers: {',
        '    "Content-Type": "application/json",',
        '    "Authorization": "Basic dXNlcjpwYXNz",',
        '  },',
        '  body: JSON.stringify({',
        '    "name": "a",',
        '    "ok": true,',
        '    "n": null',
        '  }),',
        '});',
        '',
        'const data = await response.text();',
      ].join('\n'),
    );
  });

  it('generates axios with a data object', () => {
    const output = convertCurl(json, 'axios');
    expect(output).toContain("import axios from 'axios';");
    expect(output).toContain('  method: "post",');
    expect(output).toContain('  data: {\n    "name": "a",');
    expect(output).toContain('  maxRedirects: 0,');
  });

  it('generates Node https', () => {
    const output = convertCurl(json, 'node');
    expect(output).toContain("import https from 'node:https';");
    expect(output).toContain('  hostname: "api.example.com",');
    expect(output).toContain('req.write("{\\"name\\":\\"a\\",\\"ok\\":true,\\"n\\":null}");');
  });

  it('generates Python requests with json and auth', () => {
    const output = convertCurl(json, 'python');
    expect(output).toContain('json_data = {\n    "name": "a",\n    "ok": True,\n    "n": None,\n}');
    expect(output).toContain('auth=("user", "pass")');
    expect(output).toContain('json=json_data');
  });

  it('builds FormData for multipart bodies', () => {
    const output = convertCurl(request(`curl -F 'file=@a.png' -F x=1 https://x.io`), 'fetch');
    expect(output).toContain('form.append("file", fileInput.files[0], "a.png");');
    expect(output).toContain('  body: form,');
  });

  it('keeps an explicit Authorization header over -u', () => {
    const parsed = request(`curl -u a:b -H 'Authorization: Bearer t' https://x.io`);
    expect(convertCurl(parsed, 'fetch')).not.toContain('Basic');
    expect(convertCurl(parsed, 'python')).not.toContain('auth=');
  });
});

describe('pyLiteral', () => {
  it('keeps strings that look like literals', () => {
    expect(pyLiteral({ a: 'true', b: [false, null], c: {} })).toBe(
      '{\n    "a": "true",\n    "b": [\n        False,\n        None,\n    ],\n    "c": {},\n}',
    );
  });
});
