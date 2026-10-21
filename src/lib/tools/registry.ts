export const categories = [
  { id: 'ids', label: 'IDs & documents' },
  { id: 'encoding', label: 'Encoding & hashing' },
  { id: 'sql', label: 'SQL' },
  { id: 'data', label: 'Data formats' },
  { id: 'time', label: 'Time' },
  { id: 'text', label: 'Text' },
  { id: 'money', label: 'Money & ledger' },
  { id: 'fintech', label: 'Fintech' },
  { id: 'http', label: 'HTTP & auth' },
  { id: 'jwt', label: 'JWT' },
  { id: 'web', label: 'Web & front' },
  { id: 'dev', label: 'Dev utilities' },
  { id: 'devops', label: 'DevOps' },
  { id: 'files', label: 'Files' },
] as const;

export type CategoryId = (typeof categories)[number]['id'];

export interface Category {
  id: CategoryId;
  label: string;
}

export interface ToolMeta {
  slug: string;
  name: string;
  category: CategoryId;
  description: string;
  keywords: string[];
}

export const tools: ToolMeta[] = [
  {
    slug: 'rut',
    name: 'RUT (Chile)',
    category: 'ids',
    description:
      'Generate valid Chilean RUTs, validate the check digit and format with or without dots.',
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

export function toolsByCategory(): { category: Category; tools: ToolMeta[] }[] {
  return categoriesWithTools().map((category) => ({
    category,
    tools: tools
      .filter((tool) => tool.category === category.id)
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

export function toolPath(tool: ToolMeta): string {
  return `tools/${tool.category}/${tool.slug}/`;
}

export function withBase(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
