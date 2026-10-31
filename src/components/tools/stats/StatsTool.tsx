import { useCallback, useMemo } from 'react';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { useMessages } from '~/i18n/react';
import { clampInt } from '~/lib/tools/_shared/lines';
import { numberFormatChoices } from '~/lib/tools/_shared/localized-number';
import { pickOption } from '~/lib/tools/sql/format';
import { computeStats, type StatsOptions, type StatsResult } from '~/lib/tools/stats';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { numberFormatMessages } from '../_shared/messages';
import { NumberFormatToggle, TextOption, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { statsMessages } from './messages';

type Messages = (typeof statsMessages)['en'];

const defaults = { input: '', format: 'auto', decimals: '4' };
const PLACEHOLDER = '1.250,50\n980,25\n2.340,00\n1.120,75';

function report(stats: StatsResult | null, t: Messages): string {
  if (!stats) return '';
  return [
    `${t.count}: ${stats.count}`,
    `${t.sum}: ${stats.sum}`,
    `${t.mean}: ${stats.mean}`,
    `${t.median}: ${stats.median}`,
    `${t.min}: ${stats.min}`,
    `${t.max}: ${stats.max}`,
    ...(stats.stddevSample === null ? [] : [`${t.stddevSample}: ${stats.stddevSample}`]),
    `${t.stddevPopulation}: ${stats.stddevPopulation}`,
  ].join('\n');
}

export default function StatsTool() {
  const t = useMessages(statsMessages);
  const n = useMessages(numberFormatMessages);
  const [state, update] = useUrlState(defaults);
  const format = pickOption(state.format, numberFormatChoices, 'auto');

  const options: StatsOptions = useMemo(
    () => ({ format, decimals: clampInt(Number(state.decimals), 0, 20) }),
    [format, state.decimals],
  );
  const stats = useMemo(() => computeStats(state.input, options), [state.input, options]);
  const preview = useMemo(() => report(computeStats(PLACEHOLDER, options), t), [options, t]);

  const onInput = useCallback((input: string) => update({ input }), [update]);
  const onFormat = useSetter(update, 'format');
  const onDecimals = useSetter(update, 'decimals');
  const invalid = stats?.invalid ?? [];

  return (
    <ToolLayout
      options={
        <>
          <NumberFormatToggle value={format} onChange={onFormat} />
          <TextOption label={t.decimals} value={state.decimals} onChange={onDecimals} width={100} />
        </>
      }
      input={
        <InputPanel
          label={t.input}
          placeholder={PLACEHOLDER}
          value={state.input}
          onChange={onInput}
        />
      }
      output={
        <Stack spacing={1}>
          {stats?.ambiguous && <Alert severity="warning">{n.ambiguous}</Alert>}
          <OutputPanel
            value={report(stats, t)}
            placeholder={preview}
            error={invalid.length > 0 ? t.invalid(invalid.join(', ')) : null}
          />
        </Stack>
      }
    />
  );
}
