import { locales, type Locale } from '../../i18n/locales';
import { getCategory, tools, type ToolMeta } from '../tools/registry';
import { rankItems, type SearchField } from './fuzzy';

export function toolSearchFields(tool: ToolMeta, locale: Locale): SearchField[] {
  const category = getCategory(tool.category);
  return [
    ...locales.map((lang) => ({ text: tool.name[lang], weight: lang === locale ? 3 : 2.5 })),
    { text: tool.slug, weight: 3.5 },
    ...tool.keywords.map((keyword) => ({ text: keyword, weight: 1.5 })),
    ...locales.map((lang) => ({ text: category.label[lang], weight: 1 })),
    { text: tool.description[locale], weight: 0.3 },
  ];
}

export function searchTools(
  query: string,
  locale: Locale,
  limit = Infinity,
  items: readonly ToolMeta[] = tools,
): ToolMeta[] {
  return rankItems(items, query, (tool) => toolSearchFields(tool, locale), limit);
}
