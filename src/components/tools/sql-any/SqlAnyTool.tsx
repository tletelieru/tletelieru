import { useCallback, useMemo, type ChangeEvent } from 'react';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useMessages } from '~/i18n/react';
import {
  anyStyles,
  anyTypes,
  buildSqlAny,
  type AnyType,
  type SqlAnyError,
} from '~/lib/tools/sql-any';
import { pickOption, sqlOptionDefaults } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { sqlMessages } from '../sql/messages';
import { SqlOptions, ValueStatsText } from '../sql/SqlOptions';
import { useResolvedSqlOptions } from '../sql/useResolvedSqlOptions';
import { sqlAnyMessages } from './messages';

const defaults = {
  input: '',
  column: '',
  not: false,
  style: 'array',
  type: 'text',
  ...sqlOptionDefaults,
};

const columnPlaceholder = 'status';

const placeholders: Record<AnyType, string> = {
  text: 'pending\nprocessing\nfailed',
  int: '101\n102\n103',
  bigint: '9007199254740993\n9007199254740994',
  uuid: '0f8fad5b-d9cb-469f-a165-70867728950e\n7c9e6679-7425-40de-944b-e07fc1f90ae7',
};

export default function SqlAnyTool() {
  const t = useMessages(sqlMessages);
  const m = useMessages(sqlAnyMessages);
  const [state, update] = useUrlState(defaults);
  const style = pickOption(state.style, anyStyles, 'array');
  const type = pickOption(state.type, anyTypes, 'text');
  const placeholder = placeholders[type];
  const sqlOptions = useResolvedSqlOptions(state);

  const result = useMemo(
    () =>
      buildSqlAny(state.input, {
        ...sqlOptions,
        column: state.column,
        not: state.not,
        style,
        type,
      }),
    [state.input, sqlOptions, state.column, state.not, style, type],
  );

  const outputPlaceholder = useMemo(
    () =>
      buildSqlAny(placeholder, {
        ...sqlOptions,
        column: state.column || columnPlaceholder,
        not: state.not,
        style,
        type,
      }).output,
    [placeholder, sqlOptions, state.column, state.not, style, type],
  );

  const describeError = useCallback(
    (error: SqlAnyError) =>
      error.code === 'invalidValues' ? m.invalidValues(error.type, error.values) : t.error(error),
    [m, t],
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

  const onStyleChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ style: value });
    },
    [update],
  );

  const onTypeChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ type: value });
    },
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
            sx={{ width: 200 }}
            fullWidth={false}
            onChange={onColumnChange}
          />
          <ToggleButtonGroup
            exclusive
            size="small"
            value={style}
            onChange={onStyleChange}
            aria-label={m.style}
          >
            <ToggleButton value="array">ARRAY[…]</ToggleButton>
            <ToggleButton value="literal">{`'{…}'::${type}[]`}</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={type}
            onChange={onTypeChange}
            aria-label={m.type}
          >
            {anyTypes.map((value) => (
              <ToggleButton key={value} value={value}>
                {value}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <FormControlLabel
            control={<Switch checked={state.not} onChange={onNotChange} />}
            label={m.not}
          />
          <SqlOptions state={state} update={update} quoteStyle={false} />
        </>
      }
      input={
        <InputPanel
          label={t.values}
          placeholder={placeholder}
          value={state.input}
          onChange={onInputChange}
          actions={<ValueStatsText stats={result.stats} />}
        />
      }
      output={
        <OutputPanel
          value={result.output}
          error={result.error && describeError(result.error)}
          placeholder={outputPlaceholder}
        />
      }
    />
  );
}
