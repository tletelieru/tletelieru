import { defineMessages } from '~/i18n/react';
import type { JsonErrorDetail, JsonExpected } from '~/lib/tools/json';

function quote(char: string): string {
  return char.length > 2 && char.startsWith('U+') ? char : `'${char}'`;
}

const expectedEn: Record<JsonExpected, string> = {
  value: 'expected a value',
  colon: "expected ':' after the property name",
  'property-name': 'expected a double-quoted property name',
  'comma-or-brace': "expected ',' or '}' after the property value",
  'comma-or-bracket': "expected ',' or ']' after the array element",
};

const expectedEs: Record<JsonExpected, string> = {
  value: 'se esperaba un valor',
  colon: "se esperaba ':' después del nombre de la propiedad",
  'property-name': 'se esperaba un nombre de propiedad entre comillas dobles',
  'comma-or-brace': "se esperaba ',' o '}' después del valor de la propiedad",
  'comma-or-bracket': "se esperaba ',' o ']' después del elemento del arreglo",
};

function errorEn(detail: JsonErrorDetail): string {
  switch (detail.code) {
    case 'empty':
      return 'Input is empty';
    case 'unexpected-end':
      return `Unexpected end of input: ${expectedEn[detail.expected]}`;
    case 'unexpected-token':
      return `Unexpected token '${detail.token}': ${expectedEn[detail.expected]}`;
    case 'unexpected-char':
      return `Unexpected character ${quote(detail.char)}: ${expectedEn[detail.expected]}`;
    case 'unexpected-close':
      return `Unexpected '${detail.char}': expected a value`;
    case 'single-quote-string':
      return 'Strings must use double quotes, not single quotes';
    case 'single-quote-key':
      return 'Property names must use double quotes, not single quotes';
    case 'unquoted-key':
      return `Property names must be double-quoted strings (found ${detail.key})`;
    case 'trailing-comma':
      return `Trailing comma before '${detail.before}' is not allowed`;
    case 'comment':
      return 'Comments are not allowed in JSON';
    case 'trailing-content':
      return 'Unexpected content after the end of the JSON value';
    case 'invalid-literal':
      return `'${detail.literal}' is not a valid JSON value`;
    case 'number-minus':
      return 'Invalid number: expected a digit after the minus sign';
    case 'number-leading-zero':
      return 'Invalid number: leading zeros are not allowed';
    case 'number-leading-plus':
      return "Invalid number: a leading '+' is not allowed";
    case 'number-leading-dot':
      return 'Invalid number: expected a digit before the decimal point';
    case 'number-fraction':
      return 'Invalid number: expected a digit after the decimal point';
    case 'number-exponent':
      return 'Invalid number: expected a digit in the exponent';
    case 'invalid-escape':
      return `Invalid escape sequence '${detail.escape}' in string`;
    case 'invalid-unicode-escape':
      return 'Invalid unicode escape: \\u must be followed by 4 hex digits';
    case 'string-line-break':
      return 'Unterminated string: line break inside a string';
    case 'unterminated-string':
      return 'Unterminated string: missing closing double quote';
    case 'control-char':
      return `Control character ${quote(detail.char)} must be escaped in strings`;
  }
}

function errorEs(detail: JsonErrorDetail): string {
  switch (detail.code) {
    case 'empty':
      return 'La entrada está vacía';
    case 'unexpected-end':
      return `Fin inesperado de la entrada: ${expectedEs[detail.expected]}`;
    case 'unexpected-token':
      return `Token inesperado '${detail.token}': ${expectedEs[detail.expected]}`;
    case 'unexpected-char':
      return `Carácter inesperado ${quote(detail.char)}: ${expectedEs[detail.expected]}`;
    case 'unexpected-close':
      return `'${detail.char}' inesperado: se esperaba un valor`;
    case 'single-quote-string':
      return 'Los strings deben usar comillas dobles, no simples';
    case 'single-quote-key':
      return 'Los nombres de propiedad deben usar comillas dobles, no simples';
    case 'unquoted-key':
      return `Los nombres de propiedad deben ir entre comillas dobles (se encontró ${detail.key})`;
    case 'trailing-comma':
      return `No se permite una coma final antes de '${detail.before}'`;
    case 'comment':
      return 'JSON no permite comentarios';
    case 'trailing-content':
      return 'Contenido inesperado después del final del valor JSON';
    case 'invalid-literal':
      return `'${detail.literal}' no es un valor JSON válido`;
    case 'number-minus':
      return 'Número inválido: se esperaba un dígito después del signo menos';
    case 'number-leading-zero':
      return 'Número inválido: no se permiten ceros a la izquierda';
    case 'number-leading-plus':
      return "Número inválido: no se permite un '+' inicial";
    case 'number-leading-dot':
      return 'Número inválido: se esperaba un dígito antes del punto decimal';
    case 'number-fraction':
      return 'Número inválido: se esperaba un dígito después del punto decimal';
    case 'number-exponent':
      return 'Número inválido: se esperaba un dígito en el exponente';
    case 'invalid-escape':
      return `Secuencia de escape inválida '${detail.escape}' en el string`;
    case 'invalid-unicode-escape':
      return 'Escape unicode inválido: \\u debe ir seguido de 4 dígitos hexadecimales';
    case 'string-line-break':
      return 'String sin cerrar: salto de línea dentro de un string';
    case 'unterminated-string':
      return 'String sin cerrar: falta la comilla doble de cierre';
    case 'control-char':
      return `El carácter de control ${quote(detail.char)} debe escaparse dentro de strings`;
  }
}

export const jsonMessages = defineMessages({
  en: {
    mode: 'Mode',
    format: 'Format',
    minify: 'Minify',
    validate: 'Validate',
    indent: 'Indent',
    spaces: (count: number) => `${count} spaces`,
    tab: 'Tab',
    sortKeys: 'Sort keys',
    inputLabel: 'JSON',
    valid: '✔ Valid JSON',
    error: (line: number, column: number, detail: JsonErrorDetail) =>
      `Line ${line}, column ${column}: ${errorEn(detail)}`,
    stats: (size: string, depth: number, keys: number) =>
      `${size} · depth ${depth} · ${keys} ${keys === 1 ? 'key' : 'keys'}`,
  },
  es: {
    mode: 'Modo',
    format: 'Formatear',
    minify: 'Minificar',
    validate: 'Validar',
    indent: 'Indentación',
    spaces: (count: number) => `${count} espacios`,
    tab: 'Tabulador',
    sortKeys: 'Ordenar claves',
    inputLabel: 'JSON',
    valid: '✔ JSON válido',
    error: (line: number, column: number, detail: JsonErrorDetail) =>
      `Línea ${line}, columna ${column}: ${errorEs(detail)}`,
    stats: (size: string, depth: number, keys: number) =>
      `${size} · profundidad ${depth} · ${keys} ${keys === 1 ? 'clave' : 'claves'}`,
  },
});
