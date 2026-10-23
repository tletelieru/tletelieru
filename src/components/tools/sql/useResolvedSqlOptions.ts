import { useMemo } from 'react';
import {
  resolveSqlOptions,
  type ResolvedSqlOptions,
  type SqlOptionState,
} from '~/lib/tools/sql/format';

export function useResolvedSqlOptions({
  sep,
  dedupe,
  strip,
  quote,
  escape,
  layout,
  batch,
  upper,
}: SqlOptionState): ResolvedSqlOptions {
  return useMemo(
    () => resolveSqlOptions({ sep, dedupe, strip, quote, escape, layout, batch, upper }),
    [sep, dedupe, strip, quote, escape, layout, batch, upper],
  );
}
