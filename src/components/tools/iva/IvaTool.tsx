import { useCallback, useMemo } from 'react';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { useMessages } from '~/i18n/react';
import { clampInt } from '~/lib/tools/_shared/lines';
import { numberFormatChoices } from '~/lib/tools/_shared/localized-number';
import { formatTable } from '~/lib/tools/csv-table';
import { computeIva, ivaModes, type IvaOptions, type IvaResult } from '~/lib/tools/iva';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { numberFormatMessages } from '../_shared/messages';
import { ChoiceToggle, NumberFormatToggle, TextOption, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { ivaMessages } from './messages';

type Messages = (typeof ivaMessages)['en'];

const defaults = { input: '', mode: 'netToGross', rate: '19', decimals: '0', format: 'auto' };

const PLACEHOLDERS = {
  netToGross: '10000\n25990\n1500',
  grossToNet: '11900\n30928\n1785',
};

function report(result: IvaResult | null, t: Messages): string {
  if (!result?.total) return '';
  const body = result.rows.map((row, index) => [String(index + 1), row.net, row.iva, row.gross]);
  const { net, iva, gross } = result.total;
  return formatTable([t.item, t.net, t.iva, t.gross], [...body, [t.total, net, iva, gross]], {
    style: 'box',
    alignNumbers: true,
  });
}

export default function IvaTool() {
  const t = useMessages(ivaMessages);
  const n = useMessages(numberFormatMessages);
  const [state, update] = useUrlState(defaults);
  const mode = pickOption(state.mode, ivaModes, 'netToGross');
  const format = pickOption(state.format, numberFormatChoices, 'auto');

  const options: IvaOptions = useMemo(
    () => ({ mode, rate: state.rate, decimals: clampInt(Number(state.decimals), 0, 6), format }),
    [mode, state.rate, state.decimals, format],
  );
  const result = useMemo(() => computeIva(state.input, options), [state.input, options]);
  const preview = useMemo(
    () => report(computeIva(PLACEHOLDERS[mode], options), t) || undefined,
    [mode, options, t],
  );

  const onInput = useCallback((input: string) => update({ input }), [update]);
  const onMode = useSetter(update, 'mode');
  const onRate = useSetter(update, 'rate');
  const onDecimals = useSetter(update, 'decimals');
  const onFormat = useSetter(update, 'format');

  const invalid = result?.invalid ?? [];
  const error = result
    ? invalid.map(({ line, text }) => t.invalid(line, text)).join(' · ')
    : t.badRate;

  return (
    <ToolLayout
      options={
        <>
          <ChoiceToggle
            label={t.mode}
            value={mode}
            options={ivaModes}
            labels={t.modes}
            onChange={onMode}
          />
          <TextOption label={t.rate} value={state.rate} onChange={onRate} width={90} />
          <TextOption label={t.decimals} value={state.decimals} onChange={onDecimals} width={100} />
          <NumberFormatToggle value={format} onChange={onFormat} />
        </>
      }
      input={
        <InputPanel
          label={mode === 'netToGross' ? t.netInput : t.grossInput}
          placeholder={PLACEHOLDERS[mode]}
          value={state.input}
          onChange={onInput}
          minRows={4}
        />
      }
      output={
        <Stack spacing={1}>
          {result?.ambiguous && <Alert severity="warning">{n.ambiguous}</Alert>}
          <OutputPanel
            value={report(result, t)}
            placeholder={preview}
            error={error !== '' ? error : null}
          />
        </Stack>
      }
    />
  );
}
