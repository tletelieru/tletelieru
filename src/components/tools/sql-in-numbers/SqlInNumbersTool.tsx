import { useCallback, useMemo, type ChangeEvent } from 'react';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { buildMongoInNumbers, buildSqlInNumbers } from '~/lib/tools/sql-in-numbers';
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
import { sqlInNumbersMessages } from './messages';

const defaults = {
  input: '',
  target: 'sql',
  column: '',
  not: false,
  sort: false,
  mstyle: 'pretty',
  ...sqlOptionDefaults,
};

const columnPlaceholder = 'user_id';
const placeholder = '1\n2\n3.5\n-4';

export default function SqlInNumbersTool() {
  const t = useMessages(sqlMessages);
  const m = useMessages(sqlInNumbersMessages);
  const [state, update] = useUrlState(defaults);

  const target = pickOption(state.target, queryTargets, 'sql');
  const style = pickOption(state.mstyle, mongoStyles, 'pretty');
  const mongo = target === 'mongo';

  const build = useCallback(
    (input: string, column: string) => {
      const options = resolveSqlOptions(state);
      if (mongo) {
        return buildMongoInNumbers(input, {
          field: column,
          not: state.not,
          sort: state.sort,
          parse: options.parse,
          batchSize: options.batchSize,
          style,
        });
      }
      return buildSqlInNumbers(input, { ...options, column, not: state.not, sort: state.sort });
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

  const onSortChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ sort: event.target.checked }),
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
          <FormControlLabel
            control={<Switch checked={state.sort} onChange={onSortChange} />}
            label={m.sort}
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
