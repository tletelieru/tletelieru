import { useCallback, useMemo } from 'react';
import { useMessages } from '~/i18n/react';
import { accountKinds, validateAccounts, type AccountReport } from '~/lib/tools/bank-account';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { ChoiceToggle, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { bankAccountMessages } from './messages';

type Messages = (typeof bankAccountMessages)['en'];

const defaults = { input: '', kind: 'auto' };

const PLACEHOLDER = 'DE89 3704 0044 0532 0130 00\n002010077777777771\n2850590940090418135201';

function describe(report: AccountReport, t: Messages): string {
  const kind = report.kind ? ` · ${report.kind.toUpperCase()}` : '';
  const status = report.valid ? t.valid : `${t.invalid} · ${t.error(report)}`;
  const details = report.details.map(({ key, value }) => `  ${t.detail[key]}: ${value}`);
  return [`${report.formatted}${kind} · ${status}`, ...details].join('\n');
}

function describeAll(reports: readonly AccountReport[], t: Messages): string {
  return reports.map((report) => describe(report, t)).join('\n\n');
}

export default function BankAccountTool() {
  const t = useMessages(bankAccountMessages);
  const [state, update] = useUrlState(defaults);
  const kind = pickOption(state.kind, accountKinds, 'auto');

  const output = useMemo(
    () => describeAll(validateAccounts(state.input, kind), t),
    [state.input, kind, t],
  );
  const preview = useMemo(() => describeAll(validateAccounts(PLACEHOLDER, kind), t), [kind, t]);

  const onInput = useCallback((input: string) => update({ input }), [update]);
  const onKind = useSetter(update, 'kind');

  return (
    <ToolLayout
      options={
        <ChoiceToggle
          label={t.kind}
          value={kind}
          options={accountKinds}
          labels={t.kinds}
          onChange={onKind}
        />
      }
      input={
        <InputPanel
          label={t.input}
          placeholder={PLACEHOLDER}
          value={state.input}
          onChange={onInput}
        />
      }
      output={<OutputPanel value={output} placeholder={preview} />}
    />
  );
}
