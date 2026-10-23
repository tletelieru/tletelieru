import { useCallback, useMemo, type ChangeEvent } from 'react';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { csvDelimiters, type CsvDelimiter } from '~/lib/tools/csv';
import { csvToTable, tableStyles } from '~/lib/tools/csv-table';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { DelimiterToggle } from '../csv/DelimiterToggle';
import { csvMessages } from '../csv/messages';
import { csvTableMessages } from './messages';

const defaults = {
  input: '',
  delimiter: 'auto',
  header: true,
  style: 'box',
  fence: true,
  numbers: true,
  trim: false,
};

const PLACEHOLDER =
  '"id","currency","spot","created_at"\n32188,USDCLP,927.5000,"2026-07-14 20:22:02"\n31847,BOBCLP,90.6768,"2026-06-12 16:06:32"';

export default function CsvTableTool() {
  const t = useMessages(csvTableMessages);
  const c = useMessages(csvMessages);
  const [state, update] = useUrlState(defaults);
  const delimiter = pickOption(state.delimiter, csvDelimiters, 'auto');
  const style = pickOption(state.style, tableStyles, 'box');

  const options = useMemo(
    () => ({
      delimiter,
      header: state.header,
      style,
      fence: state.fence,
      alignNumbers: state.numbers,
      trimZeros: state.trim,
    }),
    [delimiter, state.header, style, state.fence, state.numbers, state.trim],
  );

  const result = useMemo(() => csvToTable(state.input, options), [state.input, options]);

  const placeholder = useMemo(() => {
    const preview = csvToTable(PLACEHOLDER, options);
    return preview.ok ? preview.output : undefined;
  }, [options]);

  const onStyleChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ style: value });
    },
    [update],
  );

  const onDelimiterChange = useCallback(
    (value: CsvDelimiter) => update({ delimiter: value }),
    [update],
  );

  const onHeaderChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ header: event.target.checked }),
    [update],
  );

  const onFenceChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ fence: event.target.checked }),
    [update],
  );

  const onNumbersChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ numbers: event.target.checked }),
    [update],
  );

  const onTrimChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ trim: event.target.checked }),
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
            value={style}
            onChange={onStyleChange}
            aria-label={t.style}
          >
            {tableStyles.map((option) => (
              <ToggleButton key={option} value={option}>
                {t[option]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <DelimiterToggle value={delimiter} onChange={onDelimiterChange} auto />
          <FormControlLabel
            control={<Switch checked={state.header} onChange={onHeaderChange} />}
            label={c.header}
          />
          {style !== 'tsv' && (
            <FormControlLabel
              control={<Switch checked={state.fence} onChange={onFenceChange} />}
              label={t.fence}
            />
          )}
          {style !== 'tsv' && (
            <FormControlLabel
              control={<Switch checked={state.numbers} onChange={onNumbersChange} />}
              label={t.alignNumbers}
            />
          )}
          <FormControlLabel
            control={<Switch checked={state.trim} onChange={onTrimChange} />}
            label={t.trimZeros}
          />
        </>
      }
      input={
        <InputPanel
          label="CSV"
          placeholder={PLACEHOLDER}
          value={state.input}
          onChange={onInputChange}
        />
      }
      output={
        <OutputPanel
          value={result.ok ? result.output : ''}
          error={result.ok ? null : c.csvError(result.error)}
          placeholder={placeholder}
          actions={
            result.ok &&
            result.output !== '' && (
              <Typography variant="body2" color="text.secondary">
                {t.stats(c.rows(result.stats.rows), result.stats.columns)}
              </Typography>
            )
          }
        />
      }
    />
  );
}
