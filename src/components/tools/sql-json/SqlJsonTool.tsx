import { useCallback, useMemo, type ChangeEvent } from 'react';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import {
  mongoStyles,
  queryTargets,
  type MongoStyle,
  type QueryTarget,
} from '~/lib/tools/mongo/filter';
import {
  buildMongoJson,
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
import { MongoStyleToggle, TargetToggle } from '../sql/TargetToggle';
import { sqlJsonMessages } from './messages';

const defaults = {
  input: '',
  target: 'sql',
  mstyle: 'pretty',
  dialect: 'postgres',
  column: 'meta_data',
  path: 'reference',
  op: 'arrow',
  ...sqlOptionDefaults,
};

const pathPlaceholder = 'nested.key';
const placeholder = 'ref-001\nref-002';

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

  const target = pickOption(state.target, queryTargets, 'sql');
  const style = pickOption(state.mstyle, mongoStyles, 'pretty');
  const mongo = target === 'mongo';

  const build = useCallback(
    (input: string, column: string, path: string) => {
      const options = resolveSqlOptions(state);
      if (mongo) {
        return buildMongoJson(input, {
          column,
          path,
          parse: options.parse,
          batchSize: options.batchSize,
          style,
        });
      }
      return buildSqlJson(input, { ...options, dialect, column, path, operation });
    },
    [state, mongo, style, dialect, operation],
  );

  const result = useMemo(
    () => build(state.input, state.column, state.path),
    [build, state.input, state.column, state.path],
  );

  const outputPlaceholder = useMemo(
    () => build(placeholder, state.column || defaults.column, state.path || pathPlaceholder).output,
    [build, state.column, state.path],
  );

  const onTargetChange = useCallback((value: QueryTarget) => update({ target: value }), [update]);

  const onStyleChange = useCallback((value: MongoStyle) => update({ mstyle: value }), [update]);

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
          <TargetToggle value={target} onChange={onTargetChange} />
          {mongo && <MongoStyleToggle value={style} onChange={onStyleChange} />}
          {!mongo && (
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
          )}
          {!mongo && (
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
          )}
          <TextField
            label={mongo ? t.field : t.column}
            value={state.column}
            sx={{ width: 180 }}
            fullWidth={false}
            onChange={onColumnChange}
          />
          <TextField
            label={m.keyPath}
            placeholder={pathPlaceholder}
            value={state.path}
            sx={{ width: 180 }}
            fullWidth={false}
            onChange={onPathChange}
          />
          <SqlOptions
            state={state}
            update={update}
            quoteStyle={false}
            escape={false}
            layout={!mongo}
            uppercase={!mongo}
          />
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
          error={result.error && t.error(result.error)}
          placeholder={outputPlaceholder}
        />
      }
    />
  );
}
