import { useCallback, useMemo } from 'react';
import { useMessages } from '~/i18n/react';
import { validateBankCodes, type BankCodeReport } from '~/lib/tools/bank-codes';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { bankCodesMessages } from './messages';

type Messages = (typeof bankCodesMessages)['en'];

const defaults = { input: '' };
const PLACEHOLDER = 'BCHICLRM\n021000021\n12-34-56';

function describe(report: BankCodeReport, t: Messages): string {
  const kind = report.kind ? ` · ${t.kinds[report.kind]}` : '';
  const status = report.valid
    ? t.valid
    : `${t.invalid}${report.error ? ` · ${t.errors[report.error]}` : ''}`;
  const details = report.details.map(({ key, value }) =>
    value === '' ? `  ${t.details[key]}` : `  ${t.details[key]}: ${value}`,
  );
  return [`${report.formatted}${kind} · ${status}`, ...details].join('\n');
}

function describeAll(input: string, t: Messages): string {
  return validateBankCodes(input)
    .map((report) => describe(report, t))
    .join('\n\n');
}

export default function BankCodesTool() {
  const t = useMessages(bankCodesMessages);
  const [state, update] = useUrlState(defaults);
  const output = useMemo(() => describeAll(state.input, t), [state.input, t]);
  const preview = useMemo(() => describeAll(PLACEHOLDER, t), [t]);
  const onInput = useCallback((input: string) => update({ input }), [update]);

  return (
    <ToolLayout
      input={
        <InputPanel
          label={t.input}
          placeholder={PLACEHOLDER}
          value={state.input}
          onChange={onInput}
          minRows={4}
        />
      }
      output={<OutputPanel value={output} placeholder={preview} />}
    />
  );
}
