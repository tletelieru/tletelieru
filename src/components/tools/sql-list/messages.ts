import { defineMessages } from '~/i18n/react';
import type { ListWrapper } from '~/lib/tools/sql-list';

export const sqlListMessages = defineMessages<{
  wrapper: string;
  wrappers: Record<ListWrapper, string>;
}>({
  en: {
    wrapper: 'Wrapper',
    wrappers: {
      plain: "Plain list  'a', 'b'",
      parens: "Parentheses  ('a', 'b')",
      array: "Postgres array  ARRAY['a', 'b']",
      any: '= ANY(ARRAY[...])',
      literal: "Array literal  '{a,b}'",
      values: "VALUES ('a'), ('b')",
    },
  },
  es: {
    wrapper: 'Envoltura',
    wrappers: {
      plain: "Lista simple  'a', 'b'",
      parens: "Paréntesis  ('a', 'b')",
      array: "Array de Postgres  ARRAY['a', 'b']",
      any: '= ANY(ARRAY[...])',
      literal: "Literal de array  '{a,b}'",
      values: "VALUES ('a'), ('b')",
    },
  },
});
