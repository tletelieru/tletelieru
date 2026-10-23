import { useCallback, useMemo, type ChangeEvent } from 'react';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { buildSqlInNumbers } from '~/lib/tools/sql-in-numbers';
import { resolveSqlOptions, sqlOptionDefaults } from '~/lib/tools/sql/format';
import { useMessages } from '~/i18n/react';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { sqlMessages } from '../sql/messages';
import { SqlOptions, ValueStatsText } from '../sql/SqlOptions';
import { useResolvedSqlOptions } from '../sql/useResolvedSqlOptions';
import { sqlInNumbersMessages } from './messages';

const defaults = { input: '', column: '', not: false, sort: false, ...sqlOptionDefaults };

const columnPlaceholder = 'user_id';
const placeholder = '1\n2\n3.5\n-4';

export default function SqlInNumbersTool() {
  const t = useMessages(sqlMessages);
  const m = useMessages(sqlInNumbersMessages);
  const [state, update] = useUrlState(defaults);

  const result = useMemo(
    () =>
      buildSqlInNumbers(state.input, {
        ...resolveSqlOptions(state),
        column: state.column,
        not: state.not,
        sort: state.sort,
      }),
    [state],
  );

  const sqlOptions = useResolvedSqlOptions(state);
  const outputPlaceholder = useMemo(
    () =>
      buildSqlInNumbers(placeholder, {
        ...sqlOptions,
        column: state.column || columnPlaceholder,
        not: state.not,
        sort: state.sort,
      }).output,
    [sqlOptions, state.column, state.not, state.sort],
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

  const onSortChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ sort: event.target.checked }),
    [update],
  );

  const onInputChange = useCallback((value: string) => update({ input: value }), [update]);

  return (
    <ToolLayout
      options={
        <>
          <TextField
            label={t.columnOptional}
            placeholder={columnPlaceholder}
            value={state.column}
            sx={{ width: 220 }}
            fullWidth={false}
            onChange={onColumnChange}
          />
          <FormControlLabel
            control={<Switch checked={state.not} onChange={onNotChange} />}
            label="NOT IN"
          />
          <FormControlLabel
            control={<Switch checked={state.sort} onChange={onSortChange} />}
            label={m.sort}
          />
          <SqlOptions state={state} update={update} quoteStyle={false} escape={false} />
        </>
      }
      input={
        <InputPanel
          label={m.numbers}
          placeholder={placeholder}
          value={state.input}
          onChange={onInputChange}
          actions={<ValueStatsText stats={result.stats} />}
        />
      }
      output={
        <OutputPanel
          value={result.output}
          error={result.error && t.error(result.error)}
          placeholder={outputPlaceholder}
        />
      }
    />
  );
}
