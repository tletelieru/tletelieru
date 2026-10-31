import { useCallback, useMemo } from 'react';
import { useMessages } from '~/i18n/react';
import { clampInt } from '~/lib/tools/_shared/lines';
import { formatTable } from '~/lib/tools/csv-table';
import {
  rateKinds,
  simulateInstallments,
  type InstallmentOptions,
  type InstallmentResult,
} from '~/lib/tools/installments';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { ChoiceToggle, TextOption, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { installmentsMessages } from './messages';

type Messages = (typeof installmentsMessages)['en'];

const defaults = {
  input: '',
  periods: '12',
  rate: '1.5',
  rateKind: 'monthly',
  fee: '0',
  decimals: '0',
};

const PLACEHOLDER = '1000000';

function optional(label: string, value: string | null, suffix = ''): string[] {
  return value === null ? [] : [`${label}: ${value}${suffix}`];
}

function report(result: InstallmentResult, t: Messages): string {
  const summary = [
    `${t.payment}: ${result.payment}`,
    `${t.monthlyRate}: ${result.monthlyRate} %`,
    `${t.totalPaid}: ${result.totalPaid}`,
    `${t.totalInterest}: ${result.totalInterest}`,
    `${t.received}: ${result.received}`,
    ...optional(t.irr, result.irrMonthly, ' %'),
    ...optional(t.caeNominal, result.caeNominal, ' %'),
    ...optional(t.caeEffective, result.caeEffective, ' %'),
  ];
  const table = formatTable(
    [t.number, t.payment, t.interest, t.amortization, t.balance],
    result.rows.map((row) => [
      String(row.period),
      row.payment,
      row.interest,
      row.amortization,
      row.balance,
    ]),
    { style: 'box', alignNumbers: true },
  );
  return `${summary.join('\n')}\n\n${table}`;
}

export default function InstallmentsTool() {
  const t = useMessages(installmentsMessages);
  const [state, update] = useUrlState(defaults);
  const rateKind = pickOption(state.rateKind, rateKinds, 'monthly');
  const active = state.input.trim() !== '';

  const options: Omit<InstallmentOptions, 'principal'> = useMemo(
    () => ({
      periods: Number(state.periods),
      rate: state.rate,
      rateKind,
      fee: state.fee,
      decimals: clampInt(Number(state.decimals), 0, 6),
    }),
    [state.periods, state.rate, rateKind, state.fee, state.decimals],
  );

  const result = useMemo(
    () => (active ? simulateInstallments({ ...options, principal: state.input }) : null),
    [active, options, state.input],
  );
  const preview = useMemo(() => {
    const sample = simulateInstallments({ ...options, principal: PLACEHOLDER });
    return 'error' in sample ? undefined : report(sample, t);
  }, [options, t]);

  const onInput = useCallback((input: string) => update({ input }), [update]);
  const onPeriods = useSetter(update, 'periods');
  const onRate = useSetter(update, 'rate');
  const onRateKind = useSetter(update, 'rateKind');
  const onFee = useSetter(update, 'fee');
  const onDecimals = useSetter(update, 'decimals');

  const failure = result && 'error' in result ? result.error : null;
  const success = result && !('error' in result) ? result : null;

  return (
    <ToolLayout
      options={
        <>
          <TextOption label={t.periods} value={state.periods} onChange={onPeriods} width={100} />
          <TextOption label={t.rate} value={state.rate} onChange={onRate} width={90} />
          <ChoiceToggle
            label={t.rateKind}
            value={rateKind}
            options={rateKinds}
            labels={t.kinds}
            onChange={onRateKind}
          />
          <TextOption label={t.fee} value={state.fee} onChange={onFee} width={130} />
          <TextOption label={t.decimals} value={state.decimals} onChange={onDecimals} width={100} />
        </>
      }
      input={
        <InputPanel
          label={t.input}
          placeholder={PLACEHOLDER}
          value={state.input}
          onChange={onInput}
          minRows={1}
        />
      }
      output={
        <OutputPanel
          value={success ? report(success, t) : ''}
          placeholder={preview}
          error={failure ? t.errors[failure] : null}
        />
      }
    />
  );
}
