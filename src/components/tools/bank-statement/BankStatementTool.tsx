import { useCallback, useMemo } from 'react';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { numberFormatChoices } from '~/lib/tools/_shared/localized-number';
import {
  AUTO_COLUMN,
  dateOrders,
  NO_COLUMN,
  normalizeStatement,
  statementColumns,
  statementFields,
  statementOutputs,
  type ColumnMapping,
  type StatementField,
  type StatementOptions,
  type StatementResult,
} from '~/lib/tools/bank-statement';
import { csvDelimiters, type CsvDelimiter } from '~/lib/tools/csv';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { DelimiterToggle } from '../csv/DelimiterToggle';
import { csvMessages } from '../csv/messages';
import { InputPanel } from '../_shared/InputPanel';
import { numberFormatMessages } from '../_shared/messages';
import {
  ChoiceToggle,
  NumberFormatToggle,
  SelectOption,
  SwitchOption,
  useSetter,
} from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { bankStatementMessages } from './messages';

type Messages = (typeof bankStatementMessages)['en'];
type CsvMessages = (typeof csvMessages)['en'];

const defaults = {
  input: '',
  delimiter: 'auto',
  header: true,
  numbers: 'auto',
  dates: 'auto',
  output: 'csv',
  date: AUTO_COLUMN,
  description: AUTO_COLUMN,
  debit: AUTO_COLUMN,
  credit: AUTO_COLUMN,
  balance: AUTO_COLUMN,
  amount: AUTO_COLUMN,
};

const autoMapping: ColumnMapping = {
  date: AUTO_COLUMN,
  description: AUTO_COLUMN,
  debit: AUTO_COLUMN,
  credit: AUTO_COLUMN,
  balance: AUTO_COLUMN,
  amount: AUTO_COLUMN,
};

const PLACEHOLDER =
  'Fecha;Descripción;Cargos;Abonos;Saldo\n15/01/2026;Compra supermercado;12.345;;987.655\n16/01/2026;Transferencia recibida;;100.000;1.087.655';

function errorOf(result: StatementResult, t: Messages, c: CsvMessages): string | null {
  if (!result.ok) {
    if (result.error.code === 'csv') return c.csvError(result.error.error);
    return result.error.code === 'noDate' ? t.noDate : t.noAmount;
  }
  if (result.invalid.length === 0) return null;
  return result.invalid
    .slice(0, 5)
    .map(({ row, field, text }) => t.invalid(row, t.fields[field], text))
    .join(' · ');
}

export default function BankStatementTool() {
  const t = useMessages(bankStatementMessages);
  const c = useMessages(csvMessages);
  const n = useMessages(numberFormatMessages);
  const [state, update] = useUrlState(defaults);
  const active = state.input.trim() !== '';

  const delimiter = pickOption(state.delimiter, csvDelimiters, 'auto');
  const numberFormat = pickOption(state.numbers, numberFormatChoices, 'auto');
  const dateOrder = pickOption(state.dates, dateOrders, 'auto');
  const outputFormat = pickOption(state.output, statementOutputs, 'csv');

  const base: Omit<StatementOptions, 'mapping'> = useMemo(
    () => ({ delimiter, header: state.header, numberFormat, dateOrder, output: outputFormat }),
    [delimiter, state.header, numberFormat, dateOrder, outputFormat],
  );

  const columns = useMemo(
    () => (active ? statementColumns(state.input, base) : []),
    [active, state.input, base],
  );

  const choices = useMemo(
    () => [
      { value: AUTO_COLUMN, label: t.auto },
      { value: NO_COLUMN, label: t.none },
      ...columns.map((name, index) => ({ value: String(index), label: name })),
    ],
    [columns, t],
  );

  const mapping: ColumnMapping = useMemo(() => {
    const safe = (value: string) =>
      choices.some((choice) => choice.value === value) ? value : AUTO_COLUMN;
    return {
      date: safe(state.date),
      description: safe(state.description),
      debit: safe(state.debit),
      credit: safe(state.credit),
      balance: safe(state.balance),
      amount: safe(state.amount),
    };
  }, [
    choices,
    state.date,
    state.description,
    state.debit,
    state.credit,
    state.balance,
    state.amount,
  ]);

  const result = useMemo(
    () => (active ? normalizeStatement(state.input, { ...base, mapping }) : null),
    [active, state.input, base, mapping],
  );
  const preview = useMemo(() => {
    const sample = normalizeStatement(PLACEHOLDER, { ...base, mapping: autoMapping });
    return sample.ok ? sample.output : undefined;
  }, [base]);

  const onInput = useCallback((input: string) => update({ input }), [update]);
  const onDelimiter = useCallback((value: CsvDelimiter) => update({ delimiter: value }), [update]);
  const onHeader = useSetter(update, 'header');
  const onNumbers = useSetter(update, 'numbers');
  const onDates = useSetter(update, 'dates');
  const onOutput = useSetter(update, 'output');
  const setters: Record<StatementField, (value: string) => void> = {
    date: useSetter(update, 'date'),
    description: useSetter(update, 'description'),
    debit: useSetter(update, 'debit'),
    credit: useSetter(update, 'credit'),
    balance: useSetter(update, 'balance'),
    amount: useSetter(update, 'amount'),
  };

  const success = result?.ok ? result : null;

  return (
    <ToolLayout
      options={
        <>
          <ChoiceToggle
            label={t.output}
            value={outputFormat}
            options={statementOutputs}
            labels={t.outputs}
            onChange={onOutput}
          />
          <DelimiterToggle value={delimiter} onChange={onDelimiter} auto />
          <SwitchOption label={c.header} checked={state.header} onChange={onHeader} />
          <NumberFormatToggle value={numberFormat} onChange={onNumbers} />
          <ChoiceToggle
            label={t.dateOrder}
            value={dateOrder}
            options={dateOrders}
            labels={t.dateOrders}
            onChange={onDates}
          />
        </>
      }
      input={
        <Stack spacing={2}>
          <InputPanel
            label={t.input}
            placeholder={PLACEHOLDER}
            value={state.input}
            onChange={onInput}
          />
          {columns.length > 0 && (
            <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {statementFields.map((field) => (
                <SelectOption
                  key={field}
                  label={t.fields[field]}
                  value={mapping[field]}
                  options={choices}
                  onChange={setters[field]}
                  width={170}
                />
              ))}
            </Stack>
          )}
        </Stack>
      }
      output={
        <Stack spacing={1}>
          {success?.ambiguous && <Alert severity="warning">{n.ambiguous}</Alert>}
          <OutputPanel
            value={success?.output ?? ''}
            placeholder={preview}
            error={result ? errorOf(result, t, c) : null}
            actions={
              success && (
                <Typography variant="body2" color="text.secondary">
                  {t.detected(
                    success.rows.length,
                    n.formats[success.numberFormat],
                    t.dateOrders[success.dateOrder],
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
