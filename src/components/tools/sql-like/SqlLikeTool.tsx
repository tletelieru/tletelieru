import { useCallback, useMemo, type ChangeEvent } from 'react';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { buildSqlLike, likeJoiners, likeMatches } from '~/lib/tools/sql-like';
import { pickOption, resolveSqlOptions, sqlOptionDefaults } from '~/lib/tools/sql/format';
import { useMessages } from '~/i18n/react';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { sqlMessages } from '../sql/messages';
import { SqlOptions, ValueStatsText } from '../sql/SqlOptions';
import { useResolvedSqlOptions } from '../sql/useResolvedSqlOptions';
import { sqlLikeMessages } from './messages';

const defaults = {
  input: '',
  column: '',
  match: 'contains',
  joiner: 'or',
  not: false,
  ilike: false,
  wild: false,
  wrap: true,
  ...sqlOptionDefaults,
};

const columnPlaceholder = 'email';
const placeholder = 'gmail.com\nhotmail.com';

export default function SqlLikeTool() {
  const t = useMessages(sqlMessages);
  const m = useMessages(sqlLikeMessages);
  const [state, update] = useUrlState(defaults);
  const match = pickOption(state.match, likeMatches, 'contains');
  const joiner = pickOption(state.joiner, likeJoiners, 'or');

  const result = useMemo(
    () =>
      buildSqlLike(state.input, {
        ...resolveSqlOptions(state),
        column: state.column,
        match,
        joiner,
        not: state.not,
        ilike: state.ilike,
        escapeWildcards: state.wild,
        wrap: state.wrap,
      }),
    [state, match, joiner],
  );

  const sqlOptions = useResolvedSqlOptions(state);
  const outputPlaceholder = useMemo(
    () =>
      buildSqlLike(placeholder, {
        ...sqlOptions,
        column: state.column || columnPlaceholder,
        match,
        joiner,
        not: state.not,
        ilike: state.ilike,
        escapeWildcards: state.wild,
        wrap: state.wrap,
      }).output,
    [sqlOptions, state.column, match, joiner, state.not, state.ilike, state.wild, state.wrap],
  );

  const onColumnChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ column: event.target.value }),
    [update],
  );

  const onMatchChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ match: value });
    },
    [update],
  );

  const onJoinerChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ joiner: value });
    },
    [update],
  );

  const onNotChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ not: event.target.checked }),
    [update],
  );

  const onIlikeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ ilike: event.target.checked }),
    [update],
  );

  const onWildChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ wild: event.target.checked }),
    [update],
  );

  const onWrapChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ wrap: event.target.checked }),
    [update],
  );

  const onInputChange = useCallback((value: string) => update({ input: value }), [update]);

  return (
    <ToolLayout
      options={
        <>
          <TextField
            label={t.column}
            placeholder={columnPlaceholder}
            value={state.column}
            sx={{ width: 220 }}
            fullWidth={false}
            onChange={onColumnChange}
          />
          <ToggleButtonGroup
            exclusive
            size="small"
            value={match}
            onChange={onMatchChange}
            aria-label={m.match}
          >
            <ToggleButton value="contains">{m.contains}</ToggleButton>
            <ToggleButton value="starts">{m.starts}</ToggleButton>
            <ToggleButton value="ends">{m.ends}</ToggleButton>
            <ToggleButton value="exact">{m.exact}</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={joiner}
            onChange={onJoinerChange}
            aria-label={m.joiner}
          >
            <ToggleButton value="or">OR</ToggleButton>
            <ToggleButton value="and">AND</ToggleButton>
          </ToggleButtonGroup>
          <FormControlLabel
            control={<Switch checked={state.not} onChange={onNotChange} />}
            label="NOT LIKE"
          />
          <FormControlLabel
            control={<Switch checked={state.ilike} onChange={onIlikeChange} />}
            label={m.ilike}
          />
          <FormControlLabel
            control={<Switch checked={state.wild} onChange={onWildChange} />}
            label={m.escapeWildcards}
          />
          <FormControlLabel
            control={<Switch checked={state.wrap} onChange={onWrapChange} />}
            label={m.wrap}
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
          error={result.error && t.error(result.error)}
          placeholder={outputPlaceholder}
        />
      }
    />
  );
}
