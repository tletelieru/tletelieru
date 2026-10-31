import { useCallback, useMemo } from 'react';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { useMessages } from '~/i18n/react';
import { formatTable } from '~/lib/tools/csv-table';
import {
  checkLuhnLines,
  completeLuhnLines,
  groupCard,
  luhnModes,
  testCards,
  type LuhnMode,
  type LuhnReport,
} from '~/lib/tools/luhn';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { ChoiceToggle, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { luhnMessages } from './messages';

type Messages = (typeof luhnMessages)['en'];

const defaults = { input: '', mode: 'validate' };

const PLACEHOLDERS: Record<LuhnMode, string> = {
  validate: '4242 4242 4242 4242\n4242 4242 4242 4241',
  check: '424242424242424',
  cards: '',
};

function describe(report: LuhnReport, t: Messages): string {
  if (report.digits === null) return `${report.input} · ${t.notDigits}`;
  const parts = [groupCard(report.digits), report.valid ? t.valid : t.invalid];
  if (report.checkDigit !== null) parts.push(t.expected(report.checkDigit));
  if (report.brand) parts.push(t.brands[report.brand]);
  if (report.testCard) parts.push(t.testCard);
  return parts.join(' · ');
}

function process(input: string, mode: LuhnMode, t: Messages): string {
  if (mode === 'validate') {
    return checkLuhnLines(input)
      .map((report) => describe(report, t))
      .join('\n');
  }
  if (mode === 'check') {
    return completeLuhnLines(input)
      .map(({ input: line, output }) => output ?? `${line} · ${t.notDigits}`)
      .join('\n');
  }
  return formatTable(
    [t.brand, t.number, t.type, t.source],
    testCards.map((card) => [
      t.brands[card.brand],
      groupCard(card.number),
      t.funding[card.funding],
      t.sources[card.source],
    ]),
    { style: 'box', alignNumbers: false },
  );
}

export default function LuhnTool() {
  const t = useMessages(luhnMessages);
  const [state, update] = useUrlState(defaults);
  const mode = pickOption(state.mode, luhnModes, 'validate');

  const output = useMemo(() => process(state.input, mode, t), [state.input, mode, t]);
  const preview = useMemo(() => process(PLACEHOLDERS[mode], mode, t), [mode, t]);

  const onInput = useCallback((input: string) => update({ input }), [update]);
  const onMode = useSetter(update, 'mode');

  return (
    <ToolLayout
      options={
        <ChoiceToggle
          label={t.mode}
          value={mode}
          options={luhnModes}
          labels={t.modes}
          onChange={onMode}
        />
      }
      input={
        mode !== 'cards' && (
          <InputPanel
            label={mode === 'validate' ? t.input : t.partial}
            placeholder={PLACEHOLDERS[mode]}
            value={state.input}
            onChange={onInput}
          />
        )
      }
      output={
        <Stack spacing={1}>
          {mode === 'cards' && <Alert severity="warning">{t.warning}</Alert>}
          <OutputPanel value={output} placeholder={preview} />
        </Stack>
      }
    />
  );
}
