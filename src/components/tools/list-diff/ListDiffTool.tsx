import { useCallback, useMemo } from 'react';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { numberFormatChoices } from '~/lib/tools/_shared/localized-number';
import {
  diffLists,
  type ListDiffOptions,
  type ListDiffResult,
  type ListEntry,
} from '~/lib/tools/list-diff';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { numberFormatMessages } from '../_shared/messages';
import { NumberFormatToggle, SwitchOption, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { listDiffMessages } from './messages';

type Messages = (typeof listDiffMessages)['en'];

const defaults = { input: '', changed: '', amounts: true, format: 'auto', ignoreCase: false };

const placeholders = {
  a: 'tx-1001,12500\ntx-1002,8990.50\ntx-1003,4300',
  b: 'tx-1002,8990.50\ntx-1003,4350\ntx-1004,7000',
  plainA: 'tx-1001\ntx-1002\ntx-1003',
  plainB: 'tx-1002\ntx-1003\ntx-1004',
};

function entry({ id, amount }: ListEntry): string {
  return amount === null ? `  ${id}` : `  ${id}  ${amount}`;
}

function section(title: string, lines: readonly string[]): string[] {
  return lines.length > 0 ? [title, ...lines, ''] : [];
}

function report(result: ListDiffResult, t: Messages): string {
  const duplicates = [...result.duplicates.a, ...result.duplicates.b];
  return [
    ...section(t.onlyA(result.onlyA.length), result.onlyA.map(entry)),
    ...section(t.onlyB(result.onlyB.length), result.onlyB.map(entry)),
    ...section(
      t.mismatches(result.mismatches.length),
      result.mismatches.map(({ id, a, b, delta }) => `  ${id}  A ${a}  B ${b}  Δ ${delta}`),
    ),
    ...section(t.both(result.both.length), result.both.map(entry)),
    ...section(
      t.duplicates,
      duplicates.map((id) => `  ${id}`),
    ),
    ...(result.totals ? [t.totals(result.totals.a, result.totals.b)] : []),
  ]
    .join('\n')
    .trim();
}

export default function ListDiffTool() {
  const t = useMessages(listDiffMessages);
  const n = useMessages(numberFormatMessages);
  const [state, update] = useUrlState(defaults);
  const format = pickOption(state.format, numberFormatChoices, 'auto');
  const active = state.input.trim() !== '' || state.changed.trim() !== '';

  const options: ListDiffOptions = useMemo(
    () => ({ amounts: state.amounts, format, ignoreCase: state.ignoreCase }),
    [state.amounts, format, state.ignoreCase],
  );
  const result = useMemo(
    () => (active ? diffLists(state.input, state.changed, options) : null),
    [active, state.input, state.changed, options],
  );
  const placeholderA = state.amounts ? placeholders.a : placeholders.plainA;
  const placeholderB = state.amounts ? placeholders.b : placeholders.plainB;
  const preview = useMemo(
    () => report(diffLists(placeholderA, placeholderB, options), t),
    [placeholderA, placeholderB, options, t],
  );

  const onA = useCallback((input: string) => update({ input }), [update]);
  const onB = useCallback((changed: string) => update({ changed }), [update]);
  const onAmounts = useSetter(update, 'amounts');
  const onIgnoreCase = useSetter(update, 'ignoreCase');
  const onFormat = useSetter(update, 'format');
  const invalid = result?.invalid ?? [];

  return (
    <ToolLayout
      options={
        <>
          <SwitchOption label={t.amounts} checked={state.amounts} onChange={onAmounts} />
          <SwitchOption label={t.ignoreCase} checked={state.ignoreCase} onChange={onIgnoreCase} />
          {state.amounts && <NumberFormatToggle value={format} onChange={onFormat} />}
        </>
      }
      input={
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ '& > *': { flex: 1, minWidth: 0 } }}
        >
          <InputPanel
            label={t.listA}
            placeholder={placeholderA}
            value={state.input}
            onChange={onA}
          />
          <InputPanel
            label={t.listB}
            placeholder={placeholderB}
            value={state.changed}
            onChange={onB}
            history={false}
          />
        </Stack>
      }
      output={
        <Stack spacing={1}>
          {result?.ambiguous && <Alert severity="warning">{n.ambiguous}</Alert>}
          <OutputPanel
            value={result ? report(result, t) : ''}
            placeholder={preview}
            error={
              invalid.length > 0
                ? invalid
                    .map(({ side, line, text }) => t.invalid(side.toUpperCase(), line, text))
                    .join(' · ')
                : null
            }
            actions={
              result && (
                <Typography variant="body2" color="text.secondary">
                  {t.summary(
                    result.onlyA.length,
                    result.onlyB.length,
                    result.both.length,
                    result.mismatches.length,
                  )}
                </Typography>
              )
            }
          />
        </Stack>
      }
    />
  );
}
