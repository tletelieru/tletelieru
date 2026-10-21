import { useCallback, useMemo, type ChangeEvent } from 'react';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { buildSqlInText } from '~/lib/tools/sql-in-text';
import { resolveSqlOptions, sqlOptionDefaults } from '~/lib/tools/sql/format';
import { useMessages } from '~/i18n/react';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { sqlMessages } from '../sql/messages';
import { SqlOptions, ValueStatsText } from '../sql/SqlOptions';

const defaults = { input: '', column: '', not: false, ...sqlOptionDefaults };

export default function SqlInTextTool() {
  const t = useMessages(sqlMessages);
  const [state, update] = useUrlState(defaults);

  const result = useMemo(
    () =>
      buildSqlInText(state.input, {
        ...resolveSqlOptions(state),
        column: state.column,
        not: state.not,
      }),
    [state],
  );

  const onColumnChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ column: event.target.value }),
    [update],
  );

  const onNotChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ not: event.target.checked }),
    [update],
  );

  const onInputChange = useCallback((value: string) => update({ input: value }), [update]);

  return (
    <ToolLayout
      options={
        <>
          <TextField
            label={t.columnOptional}
            placeholder="transaction_id"
            value={state.column}
            sx={{ width: 220 }}
            fullWidth={false}
            onChange={onColumnChange}
          />
          <FormControlLabel
            control={<Switch checked={state.not} onChange={onNotChange} />}
            label="NOT IN"
          />
          <SqlOptions state={state} update={update} />
        </>
      }
      input={
        <InputPanel
          label={t.values}
          placeholder={
            'txn_ab8fcd54-7491-4a31-8066-cf805be27871\ntxn_a34e722a-1c2b-4d3e-9f80-1234567890ab'
          }
          value={state.input}
          onChange={onInputChange}
          actions={<ValueStatsText stats={result.stats} />}
        />
      }
      output={<OutputPanel value={result.output} error={result.error && t.error(result.error)} />}
    />
  );
}
