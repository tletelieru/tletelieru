import { useCallback, useMemo, type ChangeEvent } from 'react';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import {
  convertCsvJson,
  csvDelimiters,
  csvJsonModes,
  type CsvDelimiter,
  type CsvJsonError,
} from '~/lib/tools/csv';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { DelimiterToggle } from '../csv/DelimiterToggle';
import { csvMessages } from '../csv/messages';
import { jsonMessages } from '../json/messages';
import { csvJsonMessages } from './messages';

const defaults = {
  mode: 'csv2json',
  input: '',
  delimiter: 'auto',
  header: true,
  infer: true,
  pretty: true,
};

const placeholders = {
  csv2json: 'id,name,active\n1,Ana,true\n2,"Smith, John",false',
  json2csv: '[{"id": 1, "name": "Ana", "active": true}, {"id": 2, "name": "Smith, John"}]',
};

export default function CsvJsonTool() {
  const t = useMessages(csvJsonMessages);
  const c = useMessages(csvMessages);
  const j = useMessages(jsonMessages);
  const [state, update] = useUrlState(defaults);
  const mode = pickOption(state.mode, csvJsonModes, 'csv2json');
  const delimiter = pickOption(state.delimiter, csvDelimiters, 'auto');
  const toCsv = mode === 'json2csv';
  const placeholder = placeholders[mode];

  const options = useMemo(
    () => ({ delimiter, header: state.header, infer: state.infer, pretty: state.pretty }),
    [delimiter, state.header, state.infer, state.pretty],
  );

  const result = useMemo(
    () => convertCsvJson(state.input, mode, options),
    [state.input, mode, options],
  );

  const outputPlaceholder = useMemo(() => {
    const preview = convertCsvJson(placeholder, mode, options);
    return preview.ok ? preview.output : undefined;
  }, [placeholder, mode, options]);

  const describeError = useCallback(
    (error: CsvJsonError): string => {
      if (error.code === 'csv') return c.csvError(error.error);
      if (error.code === 'json') return j.error(error.error.line, error.error.column, error.error);
      return t.notTabular;
    },
    [c, j, t],
  );

  const onModeChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ mode: value });
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

  const onInferChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ infer: event.target.checked }),
    [update],
  );

  const onPrettyChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ pretty: event.target.checked }),
    [update],
  );

  const onInputChange = useCallback((input: string) => update({ input }), [update]);

  const output = useMemo(() => {
    if (result.ok) return result.output;
    return result.error.code === 'json' ? result.error.error.excerpt : '';
  }, [result]);

  return (
    <ToolLayout
      options={
        <>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={mode}
            onChange={onModeChange}
            aria-label={t.mode}
          >
            <ToggleButton value="csv2json">{t.csv2json}</ToggleButton>
            <ToggleButton value="json2csv">{t.json2csv}</ToggleButton>
          </ToggleButtonGroup>
          <DelimiterToggle
            value={toCsv && delimiter === 'auto' ? 'comma' : delimiter}
            onChange={onDelimiterChange}
            auto={!toCsv}
          />
          <FormControlLabel
            control={<Switch checked={state.header} onChange={onHeaderChange} />}
            label={c.header}
          />
          {!toCsv && (
            <FormControlLabel
              control={<Switch checked={state.infer} onChange={onInferChange} />}
              label={c.infer}
            />
          )}
          {!toCsv && (
            <FormControlLabel
              control={<Switch checked={state.pretty} onChange={onPrettyChange} />}
              label={t.pretty}
            />
          )}
        </>
      }
      input={
        <InputPanel
          label={toCsv ? 'JSON' : 'CSV'}
          placeholder={placeholder}
          value={state.input}
          onChange={onInputChange}
        />
      }
      output={
        <OutputPanel
          value={output}
          error={result.ok ? null : describeError(result.error)}
          placeholder={outputPlaceholder}
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
