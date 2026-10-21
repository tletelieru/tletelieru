import { defineMessages } from '~/i18n/react';
import type { JsonErrorDetail } from '~/lib/tools/json';
import type { PresetId } from '~/lib/pipeline/presets';
import type { OperationGroup, StepError } from '~/lib/pipeline/types';
import type { JsonUnescapeErrorCode } from '~/lib/tools/json-escape';
import { caseMessages } from '../tools/case/messages';
import { htmlEntitiesMessages } from '../tools/html-entities/messages';
import { jsonEscapeMessages } from '../tools/json-escape/messages';
import { jsonMessages } from '../tools/json/messages';

type Data = NonNullable<StepError['data']>;

function text(data: Data | undefined, key: string): string {
  const value = data?.[key];
  return value === undefined ? '' : String(value);
}

function count(data: Data | undefined, key: string): number {
  const value = Number(data?.[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function unescapeError(
  messages: (typeof jsonEscapeMessages)['en'],
  data: Data | undefined,
): string {
  return messages.error(
    text(data, 'reason') as JsonUnescapeErrorCode,
    text(data, 'sequence'),
    count(data, 'line'),
    count(data, 'column'),
  );
}

function jsonDetail(data: Data | undefined): JsonErrorDetail {
  return { ...data, code: text(data, 'reason') } as unknown as JsonErrorDetail;
}

interface PipelineMessages {
  inputLabel: string;
  steps: string;
  addStep: string;
  presets: string;
  presetNames: Record<PresetId, string>;
  emptyHint: string;
  noStepsHint: string;
  step: (position: number) => string;
  operation: string;
  moveUp: string;
  moveDown: string;
  remove: string;
  showOutput: string;
  hideOutput: string;
  stepOutput: (position: number) => string;
  skipped: string;
  finalOutput: string;
  failedAt: (position: number) => string;
  groups: Record<OperationGroup, string>;
  ops: Record<string, string>;
  options: Record<string, string>;
  yes: string;
  no: string;
  values: Record<string, Record<string, string>>;
  error: (error: StepError) => string;
}

const casesEn = caseMessages.en.cases;
const casesEs = caseMessages.es.cases;

export const pipelineMessages = defineMessages<PipelineMessages>({
  en: {
    inputLabel: 'Input',
    steps: 'Steps',
    addStep: 'Add step',
    presets: 'Examples',
    presetNames: {
      'list-sql-in': 'List → dedupe → SQL IN',
      'base64-json': 'Base64 decode → JSON format',
      'names-snake-sql-in': 'Names → snake_case → SQL IN',
    },
    emptyHint: 'Paste some text, then add steps to transform it one after another.',
    noStepsHint: 'No steps yet. Use “Add step” or load an example to start a pipeline.',
    step: (position) => `Step ${position}`,
    operation: 'Operation',
    moveUp: 'Move up',
    moveDown: 'Move down',
    remove: 'Remove',
    showOutput: 'Show output',
    hideOutput: 'Hide output',
    stepOutput: (position) => `Output of step ${position}`,
    skipped: 'Not run because a previous step failed.',
    finalOutput: 'Final output',
    failedAt: (position) => `The pipeline stopped at step ${position}.`,
    groups: {
      lines: 'Lines',
      text: 'Text',
      case: 'Case',
      json: 'JSON',
      sql: 'SQL',
      ids: 'IDs',
      time: 'Time',
      encoding: 'Encoding',
    },
    ops: {
      'trim-lines': 'Trim each line',
      'remove-blank': 'Remove blank lines',
      dedupe: 'Remove duplicate lines',
      sort: 'Sort lines',
      reverse: 'Reverse lines',
      affix: 'Add prefix / suffix',
      join: 'Join lines',
      split: 'Split into lines',
      upper: 'UPPERCASE',
      lower: 'lowercase',
      trim: 'Trim text',
      replace: 'Find and replace',
      case: 'Convert case',
      'json-format': 'Format JSON',
      'json-minify': 'Minify JSON',
      'json-sort-keys': 'Sort JSON keys',
      'sql-in-text': 'SQL IN (text)',
      'sql-in-numbers': 'SQL IN (numbers)',
      'sql-like': 'SQL LIKE chain',
      'sql-list': 'SQL list',
      'rut-format': 'Format RUT',
      'cpf-format': 'Format CPF',
      'cnpj-format': 'Format CNPJ',
      unix: 'Convert timestamps',
      'base64-encode': 'Base64 encode',
      'base64-decode': 'Base64 decode',
      'url-encode': 'URL encode',
      'url-decode': 'URL decode',
      'html-encode': 'HTML entities encode',
      'html-decode': 'HTML entities decode',
      'json-escape': 'JSON string escape',
      'json-unescape': 'JSON string unescape',
    },
    options: {
      case: 'Letter case',
      order: 'Order',
      prefix: 'Prefix',
      suffix: 'Suffix',
      sep: 'Separator (\\n, \\t)',
      find: 'Find',
      with: 'Replace with',
      to: 'Convert to',
      indent: 'Indent',
      quote: 'Quote style',
      column: 'Column',
      not: 'Negate (NOT)',
      layout: 'Layout',
      split: 'Split on',
      dedupe: 'Remove duplicates',
      sorted: 'Sort numbers',
      match: 'Match',
      joiner: 'Join with',
      ilike: 'ILIKE',
      wrapper: 'Wrapper',
      style: 'Format',
      variant: 'Alphabet',
      mode: 'Mode',
      plus: 'Decode + as space',
      scope: 'Characters',
      format: 'Entity format',
      quotes: 'Wrap in quotes',
      ascii: 'Escape non-ASCII',
    },
    yes: 'Yes',
    no: 'No',
    values: {
      case: { sensitive: 'Case-sensitive', insensitive: 'Ignore case' },
      order: { asc: 'Ascending', desc: 'Descending' },
      to: { ...casesEn, iso: 'ISO 8601 (UTC)', seconds: 'Unix seconds', milliseconds: 'Unix ms' },
      indent: { '2': '2 spaces', '4': '4 spaces', tab: 'Tab', min: 'Minified' },
      quote: {
        single: 'Single quotes',
        double: 'Double quotes',
        backtick: 'Backticks',
        none: 'None',
      },
      layout: { single: 'Single line', multi: 'One per line' },
      split: { any: 'Any separator', newline: 'Newlines only' },
      match: { contains: 'Contains', starts: 'Starts with', ends: 'Ends with', exact: 'Exact' },
      joiner: { or: 'OR', and: 'AND' },
      wrapper: {
        plain: 'Plain list',
        parens: 'Parentheses',
        array: 'ARRAY[…]',
        any: '= ANY(ARRAY[…])',
        literal: "'{…}' literal",
        values: 'VALUES rows',
      },
      style: {
        dots: 'Dots and dash',
        full: 'Full mask',
        dash: 'Dash only',
        plain: 'No separators',
      },
      variant: { standard: 'Standard', url: 'URL-safe' },
      mode: { component: 'Component', uri: 'Full URI' },
      scope: htmlEntitiesMessages.en.scopes,
      format: htmlEntitiesMessages.en.formats,
    },
    error: (error) => {
      const { data } = error;
      switch (error.code) {
        case 'json-invalid':
          return jsonMessages.en.error(
            count(data, 'line'),
            count(data, 'column'),
            jsonDetail(data),
          );
        case 'sql-column-required':
          return 'Column name is required.';
        case 'sql-invalid-column':
          return `Invalid column name: ${text(data, 'column')}`;
        case 'sql-invalid-numbers':
          return `${count(data, 'count')} ${count(data, 'count') === 1 ? 'value is' : 'values are'} not a number: ${text(data, 'values')}`;
        case 'id-invalid':
          return `Line ${count(data, 'line')} is not a valid ID: ${text(data, 'value')}`;
        case 'time-invalid':
          return `Line ${count(data, 'line')} is not a timestamp or date: ${text(data, 'value')}`;
        case 'base64-invalid':
          return 'The input is not valid Base64.';
        case 'base64-not-utf8':
          return 'The decoded bytes are not valid UTF-8 text.';
        case 'url-invalid':
          return 'The input contains an invalid percent-encoded sequence.';
        case 'json-unescape-invalid':
          return unescapeError(jsonEscapeMessages.en, data);
        case 'unknown-op':
          return `Unknown operation: ${text(data, 'op')}`;
        default:
          return `Step failed (${error.code}).`;
      }
    },
  },
  es: {
    inputLabel: 'Entrada',
    steps: 'Pasos',
    addStep: 'Agregar paso',
    presets: 'Ejemplos',
    presetNames: {
      'list-sql-in': 'Lista → sin duplicados → SQL IN',
      'base64-json': 'Decodificar Base64 → formatear JSON',
      'names-snake-sql-in': 'Nombres → snake_case → SQL IN',
    },
    emptyHint: 'Pega un texto y agrega pasos para transformarlo uno tras otro.',
    noStepsHint: 'Aún no hay pasos. Usa “Agregar paso” o carga un ejemplo para armar un pipeline.',
    step: (position) => `Paso ${position}`,
    operation: 'Operación',
    moveUp: 'Subir',
    moveDown: 'Bajar',
    remove: 'Quitar',
    showOutput: 'Ver resultado',
    hideOutput: 'Ocultar resultado',
    stepOutput: (position) => `Resultado del paso ${position}`,
    skipped: 'No se ejecutó porque falló un paso anterior.',
    finalOutput: 'Resultado final',
    failedAt: (position) => `El pipeline se detuvo en el paso ${position}.`,
    groups: {
      lines: 'Líneas',
      text: 'Texto',
      case: 'Formato de nombres',
      json: 'JSON',
      sql: 'SQL',
      ids: 'Identificadores',
      time: 'Tiempo',
      encoding: 'Codificación',
    },
    ops: {
      'trim-lines': 'Recortar cada línea',
      'remove-blank': 'Quitar líneas vacías',
      dedupe: 'Quitar líneas duplicadas',
      sort: 'Ordenar líneas',
      reverse: 'Invertir líneas',
      affix: 'Agregar prefijo / sufijo',
      join: 'Unir líneas',
      split: 'Separar en líneas',
      upper: 'MAYÚSCULAS',
      lower: 'minúsculas',
      trim: 'Recortar texto',
      replace: 'Buscar y reemplazar',
      case: 'Convertir formato',
      'json-format': 'Formatear JSON',
      'json-minify': 'Minificar JSON',
      'json-sort-keys': 'Ordenar claves JSON',
      'sql-in-text': 'SQL IN (texto)',
      'sql-in-numbers': 'SQL IN (números)',
      'sql-like': 'Cadena SQL LIKE',
      'sql-list': 'Lista SQL',
      'rut-format': 'Formatear RUT',
      'cpf-format': 'Formatear CPF',
      'cnpj-format': 'Formatear CNPJ',
      unix: 'Convertir timestamps',
      'base64-encode': 'Codificar Base64',
      'base64-decode': 'Decodificar Base64',
      'url-encode': 'Codificar URL',
      'url-decode': 'Decodificar URL',
      'html-encode': 'Codificar entidades HTML',
      'html-decode': 'Decodificar entidades HTML',
      'json-escape': 'Escapar string JSON',
      'json-unescape': 'Desescapar string JSON',
    },
    options: {
      case: 'Mayúsculas',
      order: 'Orden',
      prefix: 'Prefijo',
      suffix: 'Sufijo',
      sep: 'Separador (\\n, \\t)',
      find: 'Buscar',
      with: 'Reemplazar por',
      to: 'Convertir a',
      indent: 'Indentación',
      quote: 'Tipo de comillas',
      column: 'Columna',
      not: 'Negar (NOT)',
      layout: 'Diseño',
      split: 'Separar por',
      dedupe: 'Quitar duplicados',
      sorted: 'Ordenar números',
      match: 'Coincidencia',
      joiner: 'Unir con',
      ilike: 'ILIKE',
      wrapper: 'Envoltura',
      style: 'Formato',
      variant: 'Alfabeto',
      mode: 'Modo',
      plus: 'Decodificar + como espacio',
      scope: 'Caracteres',
      format: 'Formato de entidad',
      quotes: 'Envolver en comillas',
      ascii: 'Escapar no ASCII',
    },
    yes: 'Sí',
    no: 'No',
    values: {
      case: { sensitive: 'Distinguir mayúsculas', insensitive: 'Ignorar mayúsculas' },
      order: { asc: 'Ascendente', desc: 'Descendente' },
      to: {
        ...casesEs,
        iso: 'ISO 8601 (UTC)',
        seconds: 'Segundos Unix',
        milliseconds: 'Milisegundos Unix',
      },
      indent: { '2': '2 espacios', '4': '4 espacios', tab: 'Tabulador', min: 'Minificado' },
      quote: {
        single: 'Comillas simples',
        double: 'Comillas dobles',
        backtick: 'Backticks',
        none: 'Sin comillas',
      },
      layout: { single: 'Una línea', multi: 'Uno por línea' },
      split: { any: 'Cualquier separador', newline: 'Solo saltos de línea' },
      match: {
        contains: 'Contiene',
        starts: 'Empieza con',
        ends: 'Termina con',
        exact: 'Exacta',
      },
      joiner: { or: 'OR', and: 'AND' },
      wrapper: {
        plain: 'Lista simple',
        parens: 'Paréntesis',
        array: 'ARRAY[…]',
        any: '= ANY(ARRAY[…])',
        literal: "Literal '{…}'",
        values: 'Filas VALUES',
      },
      style: {
        dots: 'Puntos y guion',
        full: 'Máscara completa',
        dash: 'Solo guion',
        plain: 'Sin separadores',
      },
      variant: { standard: 'Estándar', url: 'Seguro para URL' },
      mode: { component: 'Componente', uri: 'URI completa' },
      scope: htmlEntitiesMessages.es.scopes,
      format: htmlEntitiesMessages.es.formats,
    },
    error: (error) => {
      const { data } = error;
      switch (error.code) {
        case 'json-invalid':
          return jsonMessages.es.error(
            count(data, 'line'),
            count(data, 'column'),
            jsonDetail(data),
          );
        case 'sql-column-required':
          return 'El nombre de la columna es obligatorio.';
        case 'sql-invalid-column':
          return `Nombre de columna inválido: ${text(data, 'column')}`;
        case 'sql-invalid-numbers':
          return `${count(data, 'count')} ${count(data, 'count') === 1 ? 'valor no es' : 'valores no son'} numéricos: ${text(data, 'values')}`;
        case 'id-invalid':
          return `La línea ${count(data, 'line')} no es un identificador válido: ${text(data, 'value')}`;
        case 'time-invalid':
          return `La línea ${count(data, 'line')} no es un timestamp ni una fecha: ${text(data, 'value')}`;
        case 'base64-invalid':
          return 'La entrada no es Base64 válido.';
        case 'base64-not-utf8':
          return 'Los bytes decodificados no son texto UTF-8 válido.';
        case 'url-invalid':
          return 'La entrada contiene una secuencia de porcentaje inválida.';
        case 'json-unescape-invalid':
          return unescapeError(jsonEscapeMessages.es, data);
        case 'unknown-op':
          return `Operación desconocida: ${text(data, 'op')}`;
        default:
          return `El paso falló (${error.code}).`;
      }
    },
  },
});
