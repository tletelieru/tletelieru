import type { Locale, Localized } from '../../i18n/locales';

export const categories = [
  { id: 'ids', label: { en: 'IDs & documents', es: 'IDs y documentos' } },
  { id: 'encoding', label: { en: 'Encoding & hashing', es: 'Codificación y hashing' } },
  { id: 'sql', label: { en: 'SQL', es: 'SQL' } },
  { id: 'data', label: { en: 'Data formats', es: 'Formatos de datos' } },
  { id: 'time', label: { en: 'Time', es: 'Tiempo' } },
  { id: 'text', label: { en: 'Text', es: 'Texto' } },
  { id: 'money', label: { en: 'Money & ledger', es: 'Dinero y contabilidad' } },
  { id: 'fintech', label: { en: 'Fintech', es: 'Fintech' } },
  { id: 'http', label: { en: 'HTTP & auth', es: 'HTTP y autenticación' } },
  { id: 'jwt', label: { en: 'JWT', es: 'JWT' } },
  { id: 'web', label: { en: 'Web & front', es: 'Web y front' } },
  { id: 'dev', label: { en: 'Dev utilities', es: 'Utilidades dev' } },
  { id: 'devops', label: { en: 'DevOps', es: 'DevOps' } },
  { id: 'files', label: { en: 'Files', es: 'Archivos' } },
] as const satisfies readonly { id: string; label: Localized }[];

export type CategoryId = (typeof categories)[number]['id'];

export interface Category {
  id: CategoryId;
  label: Localized;
}

export interface ToolMeta {
  slug: string;
  name: Localized;
  category: CategoryId;
  description: Localized;
  keywords: string[];
}

export const tools: ToolMeta[] = [
  {
    slug: 'rut',
    name: { en: 'RUT (Chile)', es: 'RUT (Chile)' },
    category: 'ids',
    description: {
      en: 'Generate valid Chilean RUTs, validate the check digit and format with or without dots.',
      es: 'Genera RUTs chilenos válidos, valida el dígito verificador y formatea con o sin puntos.',
    },
    keywords: ['chile', 'rut', 'run', 'dv', 'digito verificador', 'mod 11', 'id'],
  },
  {
    slug: 'cpf',
    name: { en: 'CPF (Brazil)', es: 'CPF (Brasil)' },
    category: 'ids',
    description: {
      en: 'Generate valid Brazilian CPFs, validate both check digits and mask or unmask them.',
      es: 'Genera CPFs brasileños válidos, valida ambos dígitos verificadores y aplica o quita la máscara.',
    },
    keywords: [
      'brasil',
      'brazil',
      'cpf',
      'cadastro de pessoas fisicas',
      'receita federal',
      'digito verificador',
      'dv',
      'mod 11',
      'id',
    ],
  },
  {
    slug: 'cnpj',
    name: { en: 'CNPJ (Brazil)', es: 'CNPJ (Brasil)' },
    category: 'ids',
    description: {
      en: 'Generate, validate and mask Brazilian CNPJs, including the new alphanumeric format.',
      es: 'Genera, valida y aplica máscara a CNPJs brasileños, incluido el nuevo formato alfanumérico.',
    },
    keywords: [
      'brasil',
      'brazil',
      'cnpj',
      'cadastro nacional da pessoa juridica',
      'alfanumerico',
      'alphanumeric',
      'receita federal',
      'empresa',
      'digito verificador',
      'dv',
      'mod 11',
    ],
  },
  {
    slug: 'national-id',
    name: { en: 'National IDs by country', es: 'Documentos de identidad por país' },
    category: 'ids',
    description: {
      en: 'Validate, format and generate national IDs and tax numbers from Argentina, Peru, Colombia, Mexico, Uruguay, Spain and Ecuador.',
      es: 'Valida, formatea y genera documentos de identidad y números tributarios de Argentina, Perú, Colombia, México, Uruguay, España y Ecuador.',
    },
    keywords: [
      'dni',
      'cuit',
      'cuil',
      'ruc',
      'nit',
      'cedula',
      'cedula de ciudadania',
      'curp',
      'rfc',
      'ci',
      'nie',
      'nif',
      'argentina',
      'peru',
      'colombia',
      'mexico',
      'uruguay',
      'espana',
      'spain',
      'ecuador',
      'documento de identidad',
      'digito verificador',
      'letra de control',
    ],
  },
  {
    slug: 'sql-in-text',
    name: { en: 'SQL IN (text)', es: 'SQL IN (texto)' },
    category: 'sql',
    description: {
      en: 'Turn a list of values into a quoted SQL IN clause, with optional column, NOT IN and batching.',
      es: 'Convierte una lista de valores en una cláusula SQL IN con comillas, con columna opcional, NOT IN y lotes.',
    },
    keywords: [
      'sql',
      'in',
      'not in',
      'where',
      'list',
      'quote',
      'strings',
      'ids',
      'batch',
      'lista',
      'comillas',
    ],
  },
  {
    slug: 'sql-in-numbers',
    name: { en: 'SQL IN (numbers)', es: 'SQL IN (números)' },
    category: 'sql',
    description: {
      en: 'Turn a list of numbers into an unquoted SQL IN clause, validating every value.',
      es: 'Convierte una lista de números en una cláusula SQL IN sin comillas, validando cada valor.',
    },
    keywords: [
      'sql',
      'in',
      'not in',
      'numbers',
      'integers',
      'ids',
      'where',
      'sort',
      'batch',
      'números',
    ],
  },
  {
    slug: 'sql-like',
    name: { en: 'SQL LIKE chain', es: 'Cadena SQL LIKE' },
    category: 'sql',
    description: {
      en: 'Build a chain of LIKE conditions from a list of values, with match modes, NOT LIKE, ILIKE and wildcard escaping.',
      es: 'Arma una cadena de condiciones LIKE desde una lista de valores, con modos de coincidencia, NOT LIKE, ILIKE y escape de comodines.',
    },
    keywords: [
      'sql',
      'like',
      'ilike',
      'not like',
      'wildcard',
      'pattern',
      'search',
      'or',
      'escape',
      'buscar',
      'comodín',
    ],
  },
  {
    slug: 'sql-json',
    name: { en: 'SQL JSON field query', es: 'Consulta SQL sobre campos JSON' },
    category: 'sql',
    description: {
      en: 'Query a JSON field by key path in Postgres (jsonb) or MySQL (JSON) for a list of values.',
      es: 'Consulta un campo JSON por ruta de clave en Postgres (jsonb) o MySQL (JSON) para una lista de valores.',
    },
    keywords: [
      'sql',
      'json',
      'jsonb',
      'postgres',
      'mysql',
      'json_extract',
      'json_contains',
      'meta_data',
      '->>',
      '@>',
    ],
  },
  {
    slug: 'sql-list',
    name: { en: 'SQL list formatter', es: 'Formateador de listas SQL' },
    category: 'sql',
    description: {
      en: 'Format a list of values for SQL as a plain list, parentheses, Postgres arrays, ANY, array literals or VALUES rows.',
      es: 'Formatea una lista de valores para SQL como lista simple, entre paréntesis, arrays de Postgres, ANY, literales de array o filas VALUES.',
    },
    keywords: [
      'sql',
      'format',
      'list',
      'quote',
      'escape',
      'array',
      'any',
      'values',
      'batch',
      'postgres',
      'formatear',
    ],
  },
  {
    slug: 'timezone',
    name: { en: 'Timezone converter', es: 'Conversor de zonas horarias' },
    category: 'time',
    description: {
      en: 'Convert a date-time between time zones (America/Santiago ↔ UTC by default) with offsets, abbreviations and DST.',
      es: 'Convierte una fecha y hora entre zonas horarias (America/Santiago ↔ UTC por defecto) con offset, abreviatura y horario de verano.',
    },
    keywords: [
      'timezone',
      'time zone',
      'tz',
      'utc',
      'gmt',
      'offset',
      'dst',
      'iana',
      'santiago',
      'zona horaria',
      'hora chile',
      'horario de verano',
      'cambio de hora',
      'convertir hora',
    ],
  },
  {
    slug: 'unix',
    name: { en: 'Unix timestamp converter', es: 'Conversor de timestamp Unix' },
    category: 'time',
    description: {
      en: 'Convert Unix timestamps (s, ms, µs, ns) to ISO 8601, RFC 2822 and relative time, and dates back to timestamps.',
      es: 'Convierte timestamps Unix (s, ms, µs, ns) a ISO 8601, RFC 2822 y tiempo relativo, y fechas de vuelta a timestamp.',
    },
    keywords: [
      'unix',
      'epoch',
      'timestamp',
      'seconds',
      'milliseconds',
      'iso 8601',
      'rfc 2822',
      'now',
      'marca de tiempo',
      'fecha',
      'segundos',
      'milisegundos',
      'hora chile',
    ],
  },
  {
    slug: 'case',
    name: { en: 'Case converter', es: 'Conversor de formato de texto' },
    category: 'text',
    description: {
      en: 'Convert text between snake_case, kebab-case, camelCase, PascalCase, CONSTANT_CASE, Title Case and more.',
      es: 'Convierte texto entre snake_case, kebab-case, camelCase, PascalCase, CONSTANT_CASE, Title Case y más.',
    },
    keywords: [
      'case',
      'snake',
      'kebab',
      'camel',
      'pascal',
      'constant',
      'title',
      'sentence',
      'dot',
      'slug',
      'mayúsculas',
      'minúsculas',
      'convertir texto',
      'formato de texto',
    ],
  },
  {
    slug: 'json',
    name: { en: 'JSON prettier', es: 'Formateador JSON' },
    category: 'data',
    description: {
      en: 'Format, minify and validate JSON with exact error positions, sorted keys and lossless numbers.',
      es: 'Formatea, minifica y valida JSON con la posición exacta de los errores, claves ordenadas y números sin pérdida.',
    },
    keywords: [
      'json',
      'format',
      'prettify',
      'beautify',
      'minify',
      'validate',
      'lint',
      'sort keys',
      'pretty print',
      'formatear',
      'minificar',
      'validar',
    ],
  },
  {
    slug: 'html',
    name: { en: 'HTML renderer', es: 'Visor de HTML' },
    category: 'web',
    description: {
      en: 'Live preview of HTML in a sandboxed iframe with network requests blocked.',
      es: 'Vista previa en vivo de HTML en un iframe aislado, con las peticiones de red bloqueadas.',
    },
    keywords: [
      'html',
      'preview',
      'render',
      'iframe',
      'sandbox',
      'live',
      'srcdoc',
      'viewer',
      'vista previa',
      'visor',
    ],
  },
];

export function getTool(slug: string): ToolMeta | undefined {
  return tools.find((tool) => tool.slug === slug);
}

export function getCategory(id: CategoryId): Category {
  const category = categories.find((item) => item.id === id);
  if (!category) throw new Error(`Unknown category: ${id}`);
  return category;
}

export function categoriesWithTools(): Category[] {
  return categories.filter((category) => tools.some((tool) => tool.category === category.id));
}

export function toolsByCategory(locale: Locale): { category: Category; tools: ToolMeta[] }[] {
  return categoriesWithTools().map((category) => ({
    category,
    tools: tools
      .filter((tool) => tool.category === category.id)
      .sort((a, b) => a.name[locale].localeCompare(b.name[locale], locale)),
  }));
}

export function toolPath(tool: ToolMeta, locale: Locale): string {
  return `${locale}/tools/${tool.category}/${tool.slug}/`;
}

export function withBase(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function toolHref(
  base: string,
  locale: Locale,
  tool: ToolMeta,
  params: Record<string, string> = {},
): string {
  const query = new URLSearchParams(params).toString();
  return `${withBase(base, toolPath(tool, locale))}${query ? `?${query}` : ''}`;
}
