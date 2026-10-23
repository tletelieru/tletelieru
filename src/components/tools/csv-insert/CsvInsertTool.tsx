import { useCallback, useMemo, type ChangeEvent } from 'react';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { clampInt } from '~/lib/tools/_shared/lines';
import { csvDelimiters, type CsvDelimiter } from '~/lib/tools/csv';
import {
  buildCsvInsert,
  identifierQuotes,
  insertModes,
  type CsvInsertOptions,
} from '~/lib/tools/csv-insert';
import { MAX_BATCH, pickOption, quoteStyles } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { DelimiterToggle } from '../csv/DelimiterToggle';
import { csvMessages } from '../csv/messages';
import { sqlMessages } from '../sql/messages';
import { csvInsertMessages } from './messages';

const defaults = {
  input: '',
  table: '',
  delimiter: 'auto',
  header: true,
  mode: 'multi',
  batch: 0,
  quote: 'single',
  escape: true,
  ident: 'auto',
  nullEmpty: true,
  infer: true,
  upper: true,
};

const tablePlaceholder = 'users';
const placeholder = "id,name,email,active\n1,Ana,ana@example.com,true\n2,O'Brien,,false";

export default function CsvInsertTool() {
  const t = useMessages(csvInsertMessages);
  const c = useMessages(csvMessages);
  const s = useMessages(sqlMessages);
  const [state, update] = useUrlState(defaults);

  const options = useMemo<Omit<CsvInsertOptions, 'table'>>(
    () => ({
      delimiter: pickOption(state.delimiter, csvDelimiters, 'auto'),
      header: state.header,
      mode: pickOption(state.mode, insertModes, 'multi'),
      batchSize: clampInt(state.batch, 0, MAX_BATCH),
      quote: pickOption(state.quote, quoteStyles, 'single'),
      escape: state.escape,
      identifiers: pickOption(state.ident, identifierQuotes, 'auto'),
      nullEmpty: state.nullEmpty,
      infer: state.infer,
      uppercase: state.upper,
    }),
    [
      state.delimiter,
      state.header,
      state.mode,
      state.batch,
      state.quote,
      state.escape,
      state.ident,
      state.nullEmpty,
      state.infer,
      state.upper,
    ],
  );

  const result = useMemo(
    () => buildCsvInsert(state.input, { ...options, table: state.table }),
    [state.input, state.table, options],
  );

  const outputPlaceholder = useMemo(
    () =>
      buildCsvInsert(placeholder, { ...options, table: state.table || tablePlaceholder }).output,
    [options, state.table],
  );

  const onTableChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ table: event.target.value }),
    [update],
  );

  const onDelimiterChange = useCallback(
    (value: CsvDelimiter) => update({ delimiter: value }),
    [update],
  );

  const onModeChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ mode: value });
    },
    [update],
  );

  const onQuoteChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ quote: value });
    },
    [update],
  );

  const onIdentChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ ident: value });
    },
    [update],
  );

  const onBatchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ batch: clampInt(Number(event.target.value), 0, MAX_BATCH) }),
    [update],
  );

  const onSwitch = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      update({ [event.target.name]: event.target.checked } as Partial<typeof defaults>),
    [update],
  );

  const onInputChange = useCallback((input: string) => update({ input }), [update]);

  return (
    <ToolLayout
      options={
        <>
          <TextField
            label={t.table}
            placeholder={tablePlaceholder}
            value={state.table}
            sx={{ width: 200 }}
            fullWidth={false}
            onChange={onTableChange}
          />
          <DelimiterToggle value={options.delimiter} onChange={onDelimiterChange} />
          <ToggleButtonGroup
            exclusive
            size="small"
            value={options.mode}
            onChange={onModeChange}
            aria-label={t.statements}
          >
            <ToggleButton value="multi">{t.multiRow}</ToggleButton>
            <ToggleButton value="single">{t.perRow}</ToggleButton>
          </ToggleButtonGroup>
          {options.mode === 'multi' && (
            <TextField
              type="number"
              label={t.rowsPerInsert}
              value={state.batch}
              sx={{ width: 200 }}
              fullWidth={false}
              slotProps={{ htmlInput: { min: 0, max: MAX_BATCH } }}
              onChange={onBatchChange}
            />
          )}
          <ToggleButtonGroup
            exclusive
            size="small"
            value={options.quote}
            onChange={onQuoteChange}
            aria-label={s.quoteStyle}
          >
            <ToggleButton value="single" aria-label={s.singleQuotes}>
              &apos;
            </ToggleButton>
            <ToggleButton value="double" aria-label={s.doubleQuotes}>
              &quot;
            </ToggleButton>
            <ToggleButton value="backtick" aria-label={s.backticks}>
              `
            </ToggleButton>
            <ToggleButton value="none" aria-label={s.noQuotes}>
              {s.none}
            </ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={options.identifiers}
            onChange={onIdentChange}
            aria-label={t.identifiers}
          >
            <ToggleButton value="auto">{t.identAuto}</ToggleButton>
            <ToggleButton value="double">&quot;col&quot;</ToggleButton>
            <ToggleButton value="backtick">`col`</ToggleButton>
            <ToggleButton value="none">{t.identNone}</ToggleButton>
          </ToggleButtonGroup>
          <FormControlLabel
            control={<Switch name="header" checked={state.header} onChange={onSwitch} />}
            label={c.header}
          />
          <FormControlLabel
            control={<Switch name="infer" checked={state.infer} onChange={onSwitch} />}
            label={t.inferSql}
          />
          <FormControlLabel
            control={<Switch name="nullEmpty" checked={state.nullEmpty} onChange={onSwitch} />}
            label={t.nullEmpty}
          />
          <FormControlLabel
            control={<Switch name="escape" checked={state.escape} onChange={onSwitch} />}
            label={s.escapeQuotes}
          />
          <FormControlLabel
            control={<Switch name="upper" checked={state.upper} onChange={onSwitch} />}
            label={s.uppercase}
          />
        </>
      }
      input={
        <InputPanel
          label="CSV"
          placeholder={placeholder}
          value={state.input}
          onChange={onInputChange}
          actions={
            result.rows > 0 && (
              <Typography variant="body2" color="text.secondary">
                {c.rows(result.rows)}
              </Typography>
            )
          }
        />
      }
      output={
        <OutputPanel
          value={result.output}
          error={result.error && t.error(result.error, c.csvError)}
          placeholder={outputPlaceholder}
        />
      }
    />
  );
}
