export type CurlTarget = 'fetch' | 'axios' | 'node' | 'python';
export const curlTargets: readonly CurlTarget[] = ['fetch', 'axios', 'node', 'python'];

export interface CurlFormField {
  name: string;
  value: string;
  file: boolean;
}

export interface CurlRequest {
  method: string;
  url: string;
  headers: [string, string][];
  body: string | null;
  form: CurlFormField[];
  user: string | null;
  compressed: boolean;
  insecure: boolean;
  followRedirects: boolean;
  ignored: string[];
}

export type CurlError =
  | { code: 'empty' }
  | { code: 'notCurl' }
  | { code: 'unterminatedQuote'; quote: string }
  | { code: 'missingValue'; flag: string }
  | { code: 'missingUrl' }
  | { code: 'invalidUrl'; url: string };

export type CurlParseResult = { ok: true; request: CurlRequest } | { ok: false; error: CurlError };

const ESCAPES: Record<string, string> = {
  n: '\n',
  t: '\t',
  r: '\r',
  '\\': '\\',
  "'": "'",
  '"': '"',
};

export function tokenizeShell(
  input: string,
): { ok: true; tokens: string[] } | { ok: false; quote: string } {
  const tokens: string[] = [];
  let current = '';
  let started = false;
  let index = 0;
  const text = input.replace(/\\\r?\n/g, ' ');
  while (index < text.length) {
    const char = text[index] ?? '';
    if (/\s/.test(char)) {
      if (started) tokens.push(current);
      current = '';
      started = false;
      index++;
      continue;
    }
    started = true;
    if (char === '$' && text[index + 1] === "'") {
      const end = findClosing(text, index + 2, "'", true);
      if (end < 0) return { ok: false, quote: "$'" };
      current += text
        .slice(index + 2, end)
        .replace(/\\(.)/g, (_, escaped: string) => ESCAPES[escaped] ?? escaped);
      index = end + 1;
    } else if (char === "'") {
      const end = text.indexOf("'", index + 1);
      if (end < 0) return { ok: false, quote: "'" };
      current += text.slice(index + 1, end);
      index = end + 1;
    } else if (char === '"') {
      const end = findClosing(text, index + 1, '"', true);
      if (end < 0) return { ok: false, quote: '"' };
      current += text.slice(index + 1, end).replace(/\\(["\\$`])/g, '$1');
      index = end + 1;
    } else if (char === '\\' && index + 1 < text.length) {
      current += text[index + 1];
      index += 2;
    } else {
      current += char;
      index++;
    }
  }
  if (started) tokens.push(current);
  return { ok: true, tokens };
}

function findClosing(text: string, from: number, quote: string, escapes: boolean): number {
  for (let index = from; index < text.length; index++) {
    if (escapes && text[index] === '\\') {
      index++;
      continue;
    }
    if (text[index] === quote) return index;
  }
  return -1;
}

const VALUE_FLAGS: Record<string, string> = {
  '-X': 'method',
  '--request': 'method',
  '-H': 'header',
  '--header': 'header',
  '-d': 'data',
  '--data': 'data',
  '--data-ascii': 'data',
  '--data-binary': 'data',
  '--data-raw': 'data',
  '--data-urlencode': 'urlencode',
  '--json': 'json',
  '-F': 'form',
  '--form': 'form',
  '--form-string': 'form-string',
  '-u': 'user',
  '--user': 'user',
  '-A': 'agent',
  '--user-agent': 'agent',
  '-e': 'referer',
  '--referer': 'referer',
  '-b': 'cookie',
  '--cookie': 'cookie',
  '--url': 'url',
  '-o': 'ignore',
  '--output': 'ignore',
  '-m': 'ignore',
  '--max-time': 'ignore',
  '--connect-timeout': 'ignore',
  '-w': 'ignore',
  '--write-out': 'ignore',
  '--retry': 'ignore',
  '-x': 'ignore',
  '--proxy': 'ignore',
};

const SWITCHES: Record<string, string> = {
  '--compressed': 'compressed',
  '-k': 'insecure',
  '--insecure': 'insecure',
  '-L': 'location',
  '--location': 'location',
  '-G': 'get',
  '--get': 'get',
  '-I': 'head',
  '--head': 'head',
  '-s': 'ignore',
  '--silent': 'ignore',
  '-S': 'ignore',
  '--show-error': 'ignore',
  '-v': 'ignore',
  '--verbose': 'ignore',
  '-i': 'ignore',
  '--include': 'ignore',
  '-f': 'ignore',
  '--fail': 'ignore',
  '-N': 'ignore',
  '--no-buffer': 'ignore',
};

function encodeUrlencoded(value: string): string {
  const eq = value.indexOf('=');
  if (eq < 0) return encodeURIComponent(value);
  const name = value.slice(0, eq);
  const content = encodeURIComponent(value.slice(eq + 1));
  return name ? `${name}=${content}` : content;
}

function splitArgs(tokens: string[]): string[] {
  const args: string[] = [];
  for (const token of tokens) {
    const long = /^(--[a-z-]+)=(.*)$/s.exec(token);
    if (long && long[1] && (VALUE_FLAGS[long[1]] || SWITCHES[long[1]])) {
      args.push(long[1], long[2] ?? '');
      continue;
    }
    const short = /^(-[A-Za-z])(.+)$/s.exec(token);
    if (short && short[1] && VALUE_FLAGS[short[1]]) {
      args.push(short[1], short[2] ?? '');
      continue;
    }
    if (
      short &&
      /^-[A-Za-z]+$/.test(token) &&
      [...token.slice(1)].every((c) => SWITCHES[`-${c}`])
    ) {
      for (const c of token.slice(1)) args.push(`-${c}`);
      continue;
    }
    args.push(token);
  }
  return args;
}

export function parseCurl(input: string): CurlParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: { code: 'empty' } };
  const tokenized = tokenizeShell(trimmed);
  if (!tokenized.ok)
    return { ok: false, error: { code: 'unterminatedQuote', quote: tokenized.quote } };
  const [first, ...rest] = tokenized.tokens;
  if (first !== 'curl') return { ok: false, error: { code: 'notCurl' } };
  const args = splitArgs(rest);
  const request: CurlRequest = {
    method: '',
    url: '',
    headers: [],
    body: null,
    form: [],
    user: null,
    compressed: false,
    insecure: false,
    followRedirects: false,
    ignored: [],
  };
  const data: string[] = [];
  let get = false;
  let head = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index] ?? '';
    const kind = VALUE_FLAGS[arg];
    if (kind) {
      const value = args[index + 1];
      if (value === undefined) return { ok: false, error: { code: 'missingValue', flag: arg } };
      index++;
      if (kind === 'method') request.method = value.toUpperCase();
      else if (kind === 'header') {
        const colon = value.indexOf(':');
        if (colon > 0)
          request.headers.push([value.slice(0, colon).trim(), value.slice(colon + 1).trim()]);
      } else if (kind === 'data') data.push(value);
      else if (kind === 'urlencode') data.push(encodeUrlencoded(value));
      else if (kind === 'json') {
        data.push(value);
        request.headers.push(['Content-Type', 'application/json'], ['Accept', 'application/json']);
      } else if (kind === 'form' || kind === 'form-string') {
        const eq = value.indexOf('=');
        const name = eq < 0 ? value : value.slice(0, eq);
        const content = eq < 0 ? '' : value.slice(eq + 1);
        const file = kind === 'form' && content.startsWith('@');
        request.form.push({ name, value: file ? content.slice(1) : content, file });
      } else if (kind === 'user') request.user = value;
      else if (kind === 'agent') request.headers.push(['User-Agent', value]);
      else if (kind === 'referer') request.headers.push(['Referer', value]);
      else if (kind === 'cookie') request.headers.push(['Cookie', value]);
      else if (kind === 'url') request.url = value;
      else request.ignored.push(arg);
      continue;
    }
    const flag = SWITCHES[arg];
    if (flag) {
      if (flag === 'compressed') request.compressed = true;
      else if (flag === 'insecure') request.insecure = true;
      else if (flag === 'location') request.followRedirects = true;
      else if (flag === 'get') get = true;
      else if (flag === 'head') head = true;
      else request.ignored.push(arg);
      continue;
    }
    if (arg.startsWith('-') && arg.length > 1) {
      request.ignored.push(arg);
      continue;
    }
    if (!request.url) request.url = arg;
  }
  if (!request.url) return { ok: false, error: { code: 'missingUrl' } };
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(request.url)
    ? request.url
    : `http://${request.url}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, error: { code: 'invalidUrl', url: request.url } };
  }
  if (get && data.length > 0) {
    for (const part of data.join('&').split('&')) {
      if (part) url.search += `${url.search ? '&' : ''}${part}`;
    }
  } else if (data.length > 0) {
    request.body = data.join('&');
  }
  request.url = url.toString();
  const hasHeader = (name: string) =>
    request.headers.some(([key]) => key.toLowerCase() === name.toLowerCase());
  if (request.body !== null && !hasHeader('content-type') && request.form.length === 0) {
    request.headers.push(['Content-Type', 'application/x-www-form-urlencoded']);
  }
  if (!request.method) {
    if (head) request.method = 'HEAD';
    else request.method = request.body !== null || request.form.length > 0 ? 'POST' : 'GET';
  }
  return { ok: true, request };
}

function basicAuth(user: string): string {
  const bytes = new TextEncoder().encode(user.includes(':') ? user : `${user}:`);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `Basic ${btoa(binary)}`;
}

function hasAuthorization(request: CurlRequest): boolean {
  return request.headers.some(([key]) => key.toLowerCase() === 'authorization');
}

function allHeaders(request: CurlRequest): [string, string][] {
  const headers = [...request.headers];
  if (request.user !== null && !hasAuthorization(request)) {
    headers.push(['Authorization', basicAuth(request.user)]);
  }
  return headers;
}

const js = (value: string) => JSON.stringify(value);

function isJson(request: CurlRequest): boolean {
  if (request.body === null) return false;
  const type = request.headers.find(([key]) => key.toLowerCase() === 'content-type')?.[1] ?? '';
  if (!type.includes('json')) return false;
  try {
    JSON.parse(request.body);
    return true;
  } catch {
    return false;
  }
}

function jsObject(entries: [string, string][], indent: string): string {
  if (entries.length === 0) return '{}';
  return `{\n${entries.map(([key, value]) => `${indent}  ${js(key)}: ${js(value)},`).join('\n')}\n${indent}}`;
}

function formDataLines(request: CurlRequest): string[] {
  return [
    'const form = new FormData();',
    ...request.form.map((field) =>
      field.file
        ? `form.append(${js(field.name)}, fileInput.files[0], ${js(field.value)});`
        : `form.append(${js(field.name)}, ${js(field.value)});`,
    ),
    '',
  ];
}

function jsBody(request: CurlRequest, stringify: boolean): string | null {
  if (request.form.length > 0) return 'form';
  if (request.body === null) return null;
  if (!isJson(request)) return js(request.body);
  const literal = JSON.stringify(JSON.parse(request.body), null, 2).replace(/\n/g, '\n  ');
  return stringify ? `JSON.stringify(${literal})` : literal;
}

function toFetch(request: CurlRequest): string {
  const headers = allHeaders(request).filter(
    ([key]) => !(request.form.length > 0 && key.toLowerCase() === 'content-type'),
  );
  const body = jsBody(request, true);
  const lines = request.form.length > 0 ? formDataLines(request) : [];
  const options = [`  method: ${js(request.method)},`];
  if (headers.length > 0) options.push(`  headers: ${jsObject(headers, '  ')},`);
  if (body) options.push(`  body: ${body},`);
  lines.push(
    `const response = await fetch(${js(request.url)}, {`,
    ...options,
    '});',
    '',
    'const data = await response.text();',
  );
  return lines.join('\n');
}

function toAxios(request: CurlRequest): string {
  const headers = allHeaders(request).filter(
    ([key]) => !(request.form.length > 0 && key.toLowerCase() === 'content-type'),
  );
  const body = jsBody(request, false);
  const lines = ["import axios from 'axios';", ''];
  if (request.form.length > 0) lines.push(...formDataLines(request));
  const config = [`  method: ${js(request.method.toLowerCase())},`, `  url: ${js(request.url)},`];
  if (headers.length > 0) config.push(`  headers: ${jsObject(headers, '  ')},`);
  if (body) config.push(`  data: ${body},`);
  if (!request.followRedirects) config.push('  maxRedirects: 0,');
  lines.push('const response = await axios({', ...config, '});', '', 'console.log(response.data);');
  return lines.join('\n');
}

function toNode(request: CurlRequest): string {
  const url = new URL(request.url);
  const headers = allHeaders(request);
  const module = url.protocol === 'http:' ? 'http' : 'https';
  const options = [`  method: ${js(request.method)},`, `  hostname: ${js(url.hostname)},`];
  if (url.port) options.push(`  port: ${url.port},`);
  options.push(`  path: ${js(`${url.pathname}${url.search}`)},`);
  if (headers.length > 0) options.push(`  headers: ${jsObject(headers, '  ')},`);
  if (request.insecure) options.push('  rejectUnauthorized: false,');
  const lines = [
    `import ${module} from 'node:${module}';`,
    '',
    'const options = {',
    ...options,
    '};',
    '',
    `const req = ${module}.request(options, (res) => {`,
    "  let data = '';",
    "  res.on('data', (chunk) => (data += chunk));",
    "  res.on('end', () => console.log(res.statusCode, data));",
    '});',
    '',
    "req.on('error', console.error);",
  ];
  if (request.form.length > 0)
    lines.push('// multipart/form-data bodies need a library such as form-data');
  else if (request.body !== null) lines.push(`req.write(${js(request.body)});`);
  lines.push('req.end();');
  return lines.join('\n');
}

const py = (value: string) => JSON.stringify(value);

export function pyLiteral(value: unknown, level = 0): string {
  const pad = '    '.repeat(level + 1);
  const close = '    '.repeat(level);
  if (value === null || value === undefined) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (typeof value === 'number' || typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return `[\n${value.map((item) => `${pad}${pyLiteral(item, level + 1)},`).join('\n')}\n${close}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return '{}';
  const body = entries
    .map(([key, item]) => `${pad}${JSON.stringify(key)}: ${pyLiteral(item, level + 1)},`)
    .join('\n');
  return `{\n${body}\n${close}}`;
}

function pyDict(entries: [string, string][]): string {
  return `{\n${entries.map(([key, value]) => `    ${py(key)}: ${py(value)},`).join('\n')}\n}`;
}

function toPython(request: CurlRequest): string {
  const headers = request.headers.filter(
    ([key]) => !(request.form.length > 0 && key.toLowerCase() === 'content-type'),
  );
  const lines = ['import requests', ''];
  const args = [py(request.url)];
  if (headers.length > 0) {
    lines.push(`headers = ${pyDict(headers)}`, '');
    args.push('headers=headers');
  }
  if (request.user !== null && !hasAuthorization(request)) {
    const colon = request.user.indexOf(':');
    const user = colon < 0 ? request.user : request.user.slice(0, colon);
    const password = colon < 0 ? '' : request.user.slice(colon + 1);
    args.push(`auth=(${py(user)}, ${py(password)})`);
  }
  const files = request.form.filter((field) => field.file);
  const fields = request.form.filter((field) => !field.file);
  if (fields.length > 0) {
    lines.push(`data = ${pyDict(fields.map((field) => [field.name, field.value]))}`, '');
    args.push('data=data');
  }
  if (files.length > 0) {
    lines.push(
      `files = {\n${files.map((field) => `    ${py(field.name)}: open(${py(field.value)}, "rb"),`).join('\n')}\n}`,
      '',
    );
    args.push('files=files');
  }
  if (request.body !== null && request.form.length === 0) {
    if (isJson(request)) {
      lines.push(`json_data = ${pyLiteral(JSON.parse(request.body) as unknown)}`, '');
      args.push('json=json_data');
    } else {
      lines.push(`data = ${py(request.body)}`, '');
      args.push('data=data');
    }
  }
  if (request.insecure) args.push('verify=False');
  if (!request.followRedirects && request.method !== 'GET') args.push('allow_redirects=False');
  lines.push(
    `response = requests.request(${py(request.method)}, ${args.join(', ')})`,
    'print(response.status_code, response.text)',
  );
  return lines.join('\n');
}

export function convertCurl(request: CurlRequest, target: CurlTarget): string {
  if (target === 'axios') return toAxios(request);
  if (target === 'node') return toNode(request);
  if (target === 'python') return toPython(request);
  return toFetch(request);
}
