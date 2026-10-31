import { useCallback, useMemo } from 'react';
import { useMessages } from '~/i18n/react';
import { roundingModes } from '~/lib/tools/_shared/decimal';
import { clampInt } from '~/lib/tools/_shared/lines';
import { formatTable } from '~/lib/tools/csv-table';
import { compareRounding, type RoundingResult } from '~/lib/tools/rounding';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { TextOption, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { roundingMessages } from './messages';

type Messages = (typeof roundingMessages)['en'];

const defaults = { input: '', decimals: '2' };
const PLACEHOLDER = '1.005\n2.675\n2.665\n-1.125\n10.5';

function report({ rows }: RoundingResult, t: Messages): string {
  if (rows.length === 0) return '';
  return formatTable(
    [t.value, ...roundingModes.map((mode) => t.modes[mode])],
    rows.map(({ value, results }) => [value, ...roundingModes.map((mode) => results[mode])]),
    { style: 'box', alignNumbers: true },
  );
}

export default function RoundingTool() {
  const t = useMessages(roundingMessages);
  const [state, update] = useUrlState(defaults);
  const decimals = clampInt(Number(state.decimals), 0, 30);

  const result = useMemo(() => compareRounding(state.input, decimals), [state.input, decimals]);
  const preview = useMemo(() => report(compareRounding(PLACEHOLDER, decimals), t), [decimals, t]);

  const onInput = useCallback((input: string) => update({ input }), [update]);
  const onDecimals = useSetter(update, 'decimals');

  return (
    <ToolLayout
      options={
        <TextOption label={t.decimals} value={state.decimals} onChange={onDecimals} width={100} />
      }
      input={
        <InputPanel
          label={t.input}
          placeholder={PLACEHOLDER}
          value={state.input}
          onChange={onInput}
          minRows={5}
        />
      }
      output={
        <OutputPanel
          value={report(result, t)}
          placeholder={preview}
          error={
            result.invalid.length > 0
              ? result.invalid.map(({ line, text }) => t.invalid(line, text)).join(' · ')
              : null
          }
        />
      }
    />
  );
}
