import { caseIds, convertLines, isCaseId } from '~/lib/tools/case';
import { formatCnpj } from '~/lib/tools/cnpj';
import { formatCpf } from '~/lib/tools/cpf';
import { formatStyles, type FormatStyle } from '~/lib/tools/ids/shared';
import { processJson, type JsonIndent } from '~/lib/tools/json';
import { formatRut, rutStyles, type RutStyle } from '~/lib/tools/rut';
import { buildSqlInNumbers } from '~/lib/tools/sql-in-numbers';
import { buildSqlInText } from '~/lib/tools/sql-in-text';
import { buildSqlLike, likeJoiners, likeMatches } from '~/lib/tools/sql-like';
import { buildSqlList, listWrappers } from '~/lib/tools/sql-list';
import {
  layouts,
  pickOption,
  quoteStyles,
  separators,
  type SqlToolResult,
} from '~/lib/tools/sql/format';
import { convertUnixLine } from '~/lib/tools/unix';
import { decodeBase64, decodeUrl, encodeBase64, encodeUrl } from './encoding';
import { enumOption, isYes, optionValue, textOption, yesNo } from './options';
import { joinLines, mapLines, naturalCompare, splitLines, unescapeSeparator } from './text';
import type { OptionValues, PipelineOperation, StepError, StepResult } from './types';

function ok(output: string): StepResult {
  return { ok: true, output };
}

function fail(code: string, data?: StepError['data']): StepResult {
  return { ok: false, error: data ? { code, data } : { code } };
}

function sqlResult(result: SqlToolResult): StepResult {
  const { error } = result;
  if (!error) return ok(result.output);
  switch (error.code) {
    case 'columnRequired':
      return fail('sql-column-required');
    case 'invalidColumn':
      return fail('sql-invalid-column', { column: error.column });
    case 'invalidNumbers':
      return fail('sql-invalid-numbers', {
        count: error.values.length,
        values: error.values.slice(0, 5).join(', '),
      });
    case 'pathRequired':
    case 'invalidPath':
      return fail('sql-invalid');
  }
}

function sqlCommon(options: OptionValues) {
  return {
    parse: {
      separator: pickOption(optionValue(options, 'split'), separators, 'newline'),
      dedupe: isYes(options, 'dedupe'),
    },
    layout: pickOption(optionValue(options, 'layout'), layouts, 'single'),
  };
}

function jsonStep(input: string, indent: JsonIndent | 'min', sortKeys: boolean): StepResult {
  if (!input.trim()) return ok('');
  const result = processJson(input, {
    mode: indent === 'min' ? 'minify' : 'format',
    indent: indent === 'min' ? '2' : indent,
    sortKeys,
  });
  if (result.ok) return ok(result.output);
  const data: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(result.error) as [string, unknown][]) {
    if (key === 'offset' || key === 'excerpt' || key === 'code') continue;
    if (typeof value === 'string' || typeof value === 'number') data[key] = value;
  }
  return fail('json-invalid', { ...data, reason: result.error.code });
}

function toIndent(value: string): JsonIndent | 'min' {
  return value === '4' || value === 'tab' || value === 'min' ? value : '2';
}

function formatIdLines(input: string, format: (line: string) => string | null): StepResult {
  const lines = splitLines(input);
  const output: string[] = [];
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) {
      output.push('');
      continue;
    }
    const formatted = format(line);
    if (formatted === null) return fail('id-invalid', { line: index + 1, value: line.trim() });
    output.push(formatted);
  }
  return ok(joinLines(output));
}

function toFormatStyle(value: string): FormatStyle {
  return pickOption(value, formatStyles, 'full');
}

const unixTargets = ['iso', 'seconds', 'milliseconds'] as const;

function convertTimeLines(input: string, target: string): StepResult {
  const field =
    target === 'seconds' ? 'seconds' : target === 'milliseconds' ? 'milliseconds' : 'isoUtc';
  const lines = splitLines(input);
  const output: string[] = [];
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) {
      output.push('');
      continue;
    }
    const result = convertUnixLine(line, { now: 0, zone: 'UTC' });
    if (!result.ok) return fail('time-invalid', { line: index + 1, value: line.trim() });
    output.push(result.details[field]);
  }
  return ok(joinLines(output));
}

export const pipelineOperations: readonly PipelineOperation[] = [
  {
    id: 'trim-lines',
    group: 'lines',
    options: [],
    run: (input) => ok(mapLines(input, (line) => line.trim())),
  },
  {
    id: 'remove-blank',
    group: 'lines',
    options: [],
    run: (input) => ok(joinLines(splitLines(input).filter((line) => line.trim()))),
  },
  {
    id: 'dedupe',
    group: 'lines',
    options: [enumOption('case', ['sensitive', 'insensitive'])],
    run: (input, options) => {
      const insensitive = options.case === 'insensitive';
      const seen = new Set<string>();
      const lines = splitLines(input).filter((line) => {
        const key = insensitive ? line.toLowerCase() : line;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return ok(joinLines(lines));
    },
  },
  {
    id: 'sort',
    group: 'lines',
    options: [enumOption('order', ['asc', 'desc'])],
    run: (input, options) => {
      const direction = options.order === 'desc' ? -1 : 1;
      const sorted = [...splitLines(input)].sort((a, b) => direction * naturalCompare(a, b));
      return ok(joinLines(sorted));
    },
  },
  {
    id: 'reverse',
    group: 'lines',
    options: [],
    run: (input) => ok(joinLines([...splitLines(input)].reverse())),
  },
  {
    id: 'affix',
    group: 'lines',
    options: [textOption('prefix'), textOption('suffix')],
    run: (input, options) =>
      ok(
        mapLines(
          input,
          (line) => `${optionValue(options, 'prefix')}${line}${optionValue(options, 'suffix')}`,
        ),
      ),
  },
  {
    id: 'join',
    group: 'lines',
    options: [textOption('sep', ', ')],
    run: (input, options) =>
      ok(splitLines(input).join(unescapeSeparator(optionValue(options, 'sep')))),
  },
  {
    id: 'split',
    group: 'lines',
    options: [textOption('sep', ',')],
    run: (input, options) => {
      const separator = unescapeSeparator(optionValue(options, 'sep'));
      return ok(separator ? joinLines(input.split(separator)) : input);
    },
  },
  {
    id: 'upper',
    group: 'text',
    options: [],
    run: (input) => ok(input.toUpperCase()),
  },
  {
    id: 'lower',
    group: 'text',
    options: [],
    run: (input) => ok(input.toLowerCase()),
  },
  {
    id: 'trim',
    group: 'text',
    options: [],
    run: (input) => ok(input.trim()),
  },
  {
    id: 'replace',
    group: 'text',
    options: [textOption('find'), textOption('with')],
    run: (input, options) => {
      const find = optionValue(options, 'find');
      return ok(find ? input.split(find).join(optionValue(options, 'with')) : input);
    },
  },
  {
    id: 'case',
    group: 'case',
    options: [enumOption('to', caseIds, 'snake')],
    run: (input, options) => {
      const target = optionValue(options, 'to');
      return ok(convertLines(input, isCaseId(target) ? target : 'snake'));
    },
  },
  {
    id: 'json-format',
    group: 'json',
    options: [enumOption('indent', ['2', '4', 'tab'])],
    run: (input, options) => jsonStep(input, toIndent(optionValue(options, 'indent')), false),
  },
  {
    id: 'json-minify',
    group: 'json',
    options: [],
    run: (input) => jsonStep(input, 'min', false),
  },
  {
    id: 'json-sort-keys',
    group: 'json',
    options: [enumOption('indent', ['2', '4', 'tab', 'min'])],
    run: (input, options) => jsonStep(input, toIndent(optionValue(options, 'indent')), true),
  },
  {
    id: 'sql-in-text',
    group: 'sql',
    options: [
      enumOption('quote', quoteStyles, 'single'),
      textOption('column'),
      enumOption('not', yesNo),
      enumOption('layout', layouts, 'single'),
      enumOption('split', separators, 'newline'),
      enumOption('dedupe', yesNo, 'yes'),
    ],
    run: (input, options) =>
      sqlResult(
        buildSqlInText(input, {
          ...sqlCommon(options),
          quote: pickOption(optionValue(options, 'quote'), quoteStyles, 'single'),
          column: optionValue(options, 'column'),
          not: isYes(options, 'not'),
        }),
      ),
  },
  {
    id: 'sql-in-numbers',
    group: 'sql',
    options: [
      textOption('column'),
      enumOption('not', yesNo),
      enumOption('sorted', yesNo),
      enumOption('layout', layouts, 'single'),
      enumOption('split', separators, 'newline'),
      enumOption('dedupe', yesNo, 'yes'),
    ],
    run: (input, options) =>
      sqlResult(
        buildSqlInNumbers(input, {
          ...sqlCommon(options),
          column: optionValue(options, 'column'),
          not: isYes(options, 'not'),
          sort: isYes(options, 'sorted'),
        }),
      ),
  },
  {
    id: 'sql-like',
    group: 'sql',
    options: [
      textOption('column', 'name'),
      enumOption('match', likeMatches, 'contains'),
      enumOption('joiner', likeJoiners, 'or'),
      enumOption('not', yesNo),
      enumOption('ilike', yesNo),
      enumOption('layout', layouts, 'single'),
      enumOption('split', separators, 'newline'),
      enumOption('dedupe', yesNo, 'yes'),
    ],
    run: (input, options) =>
      sqlResult(
        buildSqlLike(input, {
          ...sqlCommon(options),
          column: optionValue(options, 'column'),
          match: pickOption(optionValue(options, 'match'), likeMatches, 'contains'),
          joiner: pickOption(optionValue(options, 'joiner'), likeJoiners, 'or'),
          not: isYes(options, 'not'),
          ilike: isYes(options, 'ilike'),
        }),
      ),
  },
  {
    id: 'sql-list',
    group: 'sql',
    options: [
      enumOption('wrapper', listWrappers, 'parens'),
      enumOption('quote', quoteStyles, 'single'),
      textOption('column'),
      enumOption('layout', layouts, 'single'),
      enumOption('split', separators, 'newline'),
      enumOption('dedupe', yesNo, 'yes'),
    ],
    run: (input, options) =>
      sqlResult(
        buildSqlList(input, {
          ...sqlCommon(options),
          wrapper: pickOption(optionValue(options, 'wrapper'), listWrappers, 'parens'),
          quote: pickOption(optionValue(options, 'quote'), quoteStyles, 'single'),
          column: optionValue(options, 'column'),
        }),
      ),
  },
  {
    id: 'rut-format',
    group: 'ids',
    options: [enumOption('style', rutStyles, 'dots')],
    run: (input, options) => {
      const style: RutStyle = pickOption(optionValue(options, 'style'), rutStyles, 'dots');
      return formatIdLines(input, (line) => formatRut(line, { style }));
    },
  },
  {
    id: 'cpf-format',
    group: 'ids',
    options: [enumOption('style', formatStyles, 'full')],
    run: (input, options) => {
      const style = toFormatStyle(optionValue(options, 'style'));
      return formatIdLines(input, (line) => formatCpf(line, { style }));
    },
  },
  {
    id: 'cnpj-format',
    group: 'ids',
    options: [enumOption('style', formatStyles, 'full')],
    run: (input, options) => {
      const style = toFormatStyle(optionValue(options, 'style'));
      return formatIdLines(input, (line) => formatCnpj(line, { style }));
    },
  },
  {
    id: 'unix',
    group: 'time',
    options: [enumOption('to', unixTargets, 'iso')],
    run: (input, options) => convertTimeLines(input, optionValue(options, 'to')),
  },
  {
    id: 'base64-encode',
    group: 'encoding',
    options: [enumOption('variant', ['standard', 'url'])],
    run: (input, options) =>
      ok(encodeBase64(input, options.variant === 'url' ? 'url' : 'standard')),
  },
  {
    id: 'base64-decode',
    group: 'encoding',
    options: [],
    run: (input) => {
      const result = decodeBase64(input);
      if (result.ok) return ok(result.text);
      return fail(result.reason === 'utf8' ? 'base64-not-utf8' : 'base64-invalid');
    },
  },
  {
    id: 'url-encode',
    group: 'encoding',
    options: [enumOption('mode', ['component', 'uri'])],
    run: (input, options) => {
      const output = encodeUrl(input, options.mode === 'uri' ? 'uri' : 'component');
      return output === null ? fail('url-invalid') : ok(output);
    },
  },
  {
    id: 'url-decode',
    group: 'encoding',
    options: [enumOption('plus', yesNo)],
    run: (input, options) => {
      const output = decodeUrl(input, isYes(options, 'plus'));
      return output === null ? fail('url-invalid') : ok(output);
    },
  },
];

const byId = new Map(pipelineOperations.map((operation) => [operation.id, operation]));

export function getOperation(id: string): PipelineOperation | undefined {
  return byId.get(id);
}
