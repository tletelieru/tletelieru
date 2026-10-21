import { useCallback, useMemo, type ChangeEvent } from 'react';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { buildSqlList, listWrappers } from '~/lib/tools/sql-list';
import { pickOption, resolveSqlOptions, sqlOptionDefaults } from '~/lib/tools/sql/format';
import { useMessages } from '~/i18n/react';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { sqlMessages } from '../sql/messages';
import { SqlOptions, ValueStatsText } from '../sql/SqlOptions';
import { sqlListMessages } from './messages';

const defaults = { input: '', wrap: 'parens', column: '', ...sqlOptionDefaults };

export default function SqlListTool() {
  const t = useMessages(sqlMessages);
  const m = useMessages(sqlListMessages);
  const [state, update] = useUrlState(defaults);
  const wrapper = pickOption(state.wrap, listWrappers, 'parens');

  const result = useMemo(
    () =>
      buildSqlList(state.input, {
        ...resolveSqlOptions(state),
        wrapper,
        column: state.column,
      }),
    [state, wrapper],
  );

  const onWrapperChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ wrap: event.target.value }),
    [update],
  );

  const onColumnChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ column: event.target.value }),
    [update],
  );

  const onInputChange = useCallback((value: string) => update({ input: value }), [update]);

  return (
    <ToolLayout
      options={
        <>
          <TextField
            select
            label={m.wrapper}
            value={wrapper}
            sx={{ width: 280 }}
            fullWidth={false}
            onChange={onWrapperChange}
          >
            {listWrappers.map((value) => (
              <MenuItem key={value} value={value}>
                {m.wrappers[value]}
              </MenuItem>
            ))}
          </TextField>
          {wrapper === 'any' ? (
            <TextField
              label={t.columnOptional}
              placeholder="id"
              value={state.column}
              sx={{ width: 200 }}
              fullWidth={false}
              onChange={onColumnChange}
            />
          ) : null}
          <SqlOptions
            state={state}
            update={update}
            quoteStyle={wrapper !== 'literal'}
            layout={wrapper !== 'literal'}
          />
        </>
      }
      input={
        <InputPanel
          label={t.values}
          placeholder={'a\nb\nc'}
          value={state.input}
          onChange={onInputChange}
          actions={<ValueStatsText stats={result.stats} />}
        />
      }
      output={
        <OutputPanel value={result.output} error={result.error ? t.error(result.error) : null} />
      }
    />
  );
}
