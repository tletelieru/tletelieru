import { useCallback, useMemo, type ChangeEvent } from 'react';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { buildMongoInText, buildSqlInText } from '~/lib/tools/sql-in-text';
import {
  mongoStyles,
  queryTargets,
  type MongoStyle,
  type QueryTarget,
} from '~/lib/tools/mongo/filter';
import { pickOption, resolveSqlOptions, sqlOptionDefaults } from '~/lib/tools/sql/format';
import { useMessages } from '~/i18n/react';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { sqlMessages } from '../sql/messages';
import { SqlOptions, ValueStatsText } from '../sql/SqlOptions';
import { MongoStyleToggle, TargetToggle } from '../sql/TargetToggle';

const defaults = {
  input: '',
  target: 'sql',
  column: '',
  not: false,
  mstyle: 'pretty',
  ...sqlOptionDefaults,
};

const columnPlaceholder = 'transaction_id';
const placeholder =
  'txn_ab8fcd54-7491-4a31-8066-cf805be27871\ntxn_a34e722a-1c2b-4d3e-9f80-1234567890ab';

export default function SqlInTextTool() {
  const t = useMessages(sqlMessages);
  const [state, update] = useUrlState(defaults);
  const target = pickOption(state.target, queryTargets, 'sql');
  const style = pickOption(state.mstyle, mongoStyles, 'pretty');
  const mongo = target === 'mongo';

  const build = useCallback(
    (input: string, column: string) => {
      const options = resolveSqlOptions(state);
      if (mongo) {
        return buildMongoInText(input, {
          field: column,
          not: state.not,
          parse: options.parse,
          batchSize: options.batchSize,
          style,
        });
      }
      return buildSqlInText(input, { ...options, column, not: state.not });
    },
    [state, mongo, style],
  );

  const result = useMemo(
    () => build(state.input, state.column),
    [build, state.input, state.column],
  );

  const outputPlaceholder = useMemo(
    () => build(placeholder, state.column || columnPlaceholder).output,
    [build, state.column],
  );

  const onTargetChange = useCallback((value: QueryTarget) => update({ target: value }), [update]);

  const onStyleChange = useCallback((value: MongoStyle) => update({ mstyle: value }), [update]);

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
          <TargetToggle value={target} onChange={onTargetChange} />
          {mongo && <MongoStyleToggle value={style} onChange={onStyleChange} />}
          <TextField
            label={mongo ? t.field : t.columnOptional}
            placeholder={columnPlaceholder}
            value={state.column}
            sx={{ width: 220 }}
            fullWidth={false}
            onChange={onColumnChange}
          />
          <FormControlLabel
            control={<Switch checked={state.not} onChange={onNotChange} />}
            label={mongo ? 'NOT ($nin)' : 'NOT IN'}
          />
          <SqlOptions
            state={state}
            update={update}
            quoteStyle={!mongo}
            escape={!mongo}
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
