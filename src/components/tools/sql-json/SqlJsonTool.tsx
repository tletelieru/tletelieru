import { useCallback, useMemo, type ChangeEvent } from 'react';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import {
  buildSqlJson,
  jsonDialects,
  resolveOperation,
  type JsonOperation,
} from '~/lib/tools/sql-json';
import { pickOption, resolveSqlOptions, sqlOptionDefaults } from '~/lib/tools/sql/format';
import { useMessages } from '~/i18n/react';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { sqlMessages } from '../sql/messages';
import { SqlOptions, ValueStatsText } from '../sql/SqlOptions';
import { sqlJsonMessages } from './messages';

const defaults = {
  input: '',
  dialect: 'postgres',
  column: 'meta_data',
  path: 'reference',
  op: 'arrow',
  ...sqlOptionDefaults,
};

const operationLabels: Record<'postgres' | 'mysql', Partial<Record<JsonOperation, string>>> = {
  postgres: { arrow: "->> 'key'", path: "#>> '{path}'", contains: '' },
  mysql: { extract: 'JSON_EXTRACT', arrow: "->> '$.key'", contains: 'JSON_CONTAINS' },
};

export default function SqlJsonTool() {
  const t = useMessages(sqlMessages);
  const m = useMessages(sqlJsonMessages);
  const [state, update] = useUrlState(defaults);
  const dialect = pickOption(state.dialect, jsonDialects, 'postgres');
  const operation = resolveOperation(dialect, state.op);

  const result = useMemo(
    () =>
      buildSqlJson(state.input, {
        ...resolveSqlOptions(state),
        dialect,
        column: state.column,
        path: state.path,
        operation,
      }),
    [state, dialect, operation],
  );

  const onDialectChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ dialect: value });
    },
    [update],
  );

  const onOperationChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ op: value });
    },
    [update],
  );

  const onColumnChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ column: event.target.value }),
    [update],
  );

  const onPathChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ path: event.target.value }),
    [update],
  );

  const onInputChange = useCallback((value: string) => update({ input: value }), [update]);

  const labels = operationLabels[dialect];

  return (
    <ToolLayout
      options={
        <>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={dialect}
            onChange={onDialectChange}
            aria-label={m.dialect}
          >
            <ToggleButton value="postgres">Postgres (jsonb)</ToggleButton>
            <ToggleButton value="mysql">MySQL (JSON)</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={operation}
            onChange={onOperationChange}
            aria-label={m.operation}
          >
            {Object.entries(labels).map(([value, label]) => (
              <ToggleButton key={value} value={value}>
                {label || m.containment}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <TextField
            label={t.column}
            value={state.column}
            sx={{ width: 180 }}
            fullWidth={false}
            onChange={onColumnChange}
          />
          <TextField
            label={m.keyPath}
            placeholder="nested.key"
            value={state.path}
            sx={{ width: 180 }}
            fullWidth={false}
            onChange={onPathChange}
          />
          <SqlOptions state={state} update={update} quoteStyle={false} escape={false} />
        </>
      }
      input={
        <InputPanel
          label={t.values}
          placeholder={'ref-001\nref-002'}
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
