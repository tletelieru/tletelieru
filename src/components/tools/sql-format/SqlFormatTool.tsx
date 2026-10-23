import { useCallback, useMemo, type ChangeEvent } from 'react';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useMessages } from '~/i18n/react';
import { pickOption } from '~/lib/tools/sql/format';
import {
  formatSql,
  sqlFormatDialects,
  sqlIndents,
  sqlKeywordCases,
  type SqlFormatOptions,
} from '~/lib/tools/sql-format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { sqlFormatMessages } from './messages';

const defaults = { input: '', dialect: 'sql', case: 'upper', indent: '2', minify: false };

const placeholder =
  "select u.id, u.name, count(o.id) as orders from users u left join orders o on o.user_id = u.id where u.active = true and u.country in ('CL', 'AR') group by u.id, u.name order by orders desc limit 10";

export default function SqlFormatTool() {
  const t = useMessages(sqlFormatMessages);
  const [state, update] = useUrlState(defaults);

  const options = useMemo<SqlFormatOptions>(
    () => ({
      dialect: pickOption(state.dialect, sqlFormatDialects, 'sql'),
      keywordCase: pickOption(state.case, sqlKeywordCases, 'upper'),
      indent: pickOption(state.indent, sqlIndents, '2'),
      minify: state.minify,
    }),
    [state.dialect, state.case, state.indent, state.minify],
  );

  const result = useMemo(() => formatSql(state.input, options), [state.input, options]);

  const outputPlaceholder = useMemo(() => {
    const preview = formatSql(placeholder, options);
    return preview.ok ? preview.output : undefined;
  }, [options]);

  const onDialectChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ dialect: value });
    },
    [update],
  );

  const onCaseChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ case: value });
    },
    [update],
  );

  const onIndentChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ indent: value });
    },
    [update],
  );

  const onMinifyChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ minify: event.target.checked }),
    [update],
  );

  const onInputChange = useCallback((input: string) => update({ input }), [update]);

  return (
    <ToolLayout
      options={
        <>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={options.dialect}
            onChange={onDialectChange}
            aria-label={t.dialect}
          >
            <ToggleButton value="sql">{t.standard}</ToggleButton>
            <ToggleButton value="postgresql">PostgreSQL</ToggleButton>
            <ToggleButton value="mysql">MySQL</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={options.keywordCase}
            onChange={onCaseChange}
            aria-label={t.keywordCase}
          >
            <ToggleButton value="upper">{t.upper}</ToggleButton>
            <ToggleButton value="lower">{t.lower}</ToggleButton>
            <ToggleButton value="preserve">{t.preserve}</ToggleButton>
          </ToggleButtonGroup>
          {!options.minify && (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={options.indent}
              onChange={onIndentChange}
              aria-label={t.indent}
            >
              <ToggleButton value="2">{t.spaces(2)}</ToggleButton>
              <ToggleButton value="4">{t.spaces(4)}</ToggleButton>
              <ToggleButton value="tab">{t.tab}</ToggleButton>
            </ToggleButtonGroup>
          )}
          <FormControlLabel
            control={<Switch checked={state.minify} onChange={onMinifyChange} />}
            label={t.minify}
          />
        </>
      }
      input={
        <InputPanel
          label="SQL"
          placeholder={placeholder}
          value={state.input}
          onChange={onInputChange}
        />
      }
      output={
        <OutputPanel
          value={result.ok ? result.output : ''}
          error={result.ok ? null : t.error(result.error)}
          placeholder={outputPlaceholder}
        />
      }
    />
  );
}
