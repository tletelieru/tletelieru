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
