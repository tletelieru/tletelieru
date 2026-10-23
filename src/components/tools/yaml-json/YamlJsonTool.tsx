import { useCallback, useMemo } from 'react';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { pickOption } from '~/lib/tools/sql/format';
import { convertYamlJson, yamlIndents, yamlJsonModes } from '~/lib/tools/yaml-json';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { jsonMessages } from '../json/messages';
import { yamlJsonMessages } from './messages';

const defaults = { mode: 'yaml2json', input: '', indent: '2' };

const placeholders = {
  yaml2json:
    'name: tletelieru\nversion: 1.2\nfeatures:\n  - pwa\n  - i18n\nowner:\n  name: T. Letelier\n  remote: true',
  json2yaml: '{"name": "tletelieru", "features": ["pwa", "i18n"], "owner": {"remote": true}}',
};

export default function YamlJsonTool() {
  const t = useMessages(yamlJsonMessages);
  const j = useMessages(jsonMessages);
  const [state, update] = useUrlState(defaults);
  const mode = pickOption(state.mode, yamlJsonModes, 'yaml2json');
  const indent = pickOption(state.indent, yamlIndents, '2');
  const placeholder = placeholders[mode];

  const result = useMemo(
    () => convertYamlJson(state.input, mode, { indent }),
    [state.input, mode, indent],
  );

  const outputPlaceholder = useMemo(() => {
    const preview = convertYamlJson(placeholder, mode, { indent });
    return preview.ok ? preview.output : undefined;
  }, [placeholder, mode, indent]);

  const error = useMemo(() => {
    if (result.ok) return null;
    const { error: detail } = result;
    if (detail.code === 'json') {
      return j.error(detail.error.line, detail.error.column, detail.error);
    }
    return t.yamlError(detail.error);
  }, [result, j, t]);

  const onModeChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ mode: value });
    },
    [update],
  );

  const onIndentChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ indent: value });
    },
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
            value={mode}
            onChange={onModeChange}
            aria-label={t.mode}
          >
            <ToggleButton value="yaml2json">{t.yaml2json}</ToggleButton>
            <ToggleButton value="json2yaml">{t.json2yaml}</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={indent}
            onChange={onIndentChange}
            aria-label={t.indent}
          >
            <ToggleButton value="2">{t.spaces(2)}</ToggleButton>
            <ToggleButton value="4">{t.spaces(4)}</ToggleButton>
          </ToggleButtonGroup>
        </>
      }
      input={
        <InputPanel
          label={mode === 'yaml2json' ? 'YAML' : 'JSON'}
          placeholder={placeholder}
          value={state.input}
          onChange={onInputChange}
        />
      }
      output={
        <OutputPanel
          value={result.ok ? result.output : result.error.error.excerpt}
          error={error}
          placeholder={outputPlaceholder}
          actions={
            result.ok &&
            result.documents > 1 && (
              <Typography variant="body2" color="text.secondary">
                {t.documents(result.documents)}
              </Typography>
            )
          }
        />
      }
    />
  );
}
