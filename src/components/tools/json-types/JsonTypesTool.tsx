import { useCallback, useMemo, type ChangeEvent } from 'react';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { jsonToTypes, typesTargets } from '~/lib/tools/json-types';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { jsonMessages } from '../json/messages';
import { jsonTypesMessages } from './messages';

const defaults = { input: '', target: 'typescript', root: '' };

const rootPlaceholder = 'Root';
const placeholder =
  '{"id": 1, "name": "Ana", "tags": ["admin"], "address": {"city": "Santiago", "zip": null}, "orders": [{"id": 10, "total": 25.5}, {"id": 11, "total": 8, "coupon": "WELCOME"}]}';

export default function JsonTypesTool() {
  const t = useMessages(jsonTypesMessages);
  const j = useMessages(jsonMessages);
  const [state, update] = useUrlState(defaults);
  const target = pickOption(state.target, typesTargets, 'typescript');

  const result = useMemo(
    () => jsonToTypes(state.input, { target, rootName: state.root }),
    [state.input, target, state.root],
  );

  const outputPlaceholder = useMemo(() => {
    const preview = jsonToTypes(placeholder, { target, rootName: state.root });
    return preview.ok ? preview.output : undefined;
  }, [target, state.root]);

  const onTargetChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ target: value });
    },
    [update],
  );

  const onRootChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ root: event.target.value }),
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
            value={target}
            onChange={onTargetChange}
            aria-label={t.target}
          >
            <ToggleButton value="typescript">TypeScript</ToggleButton>
            <ToggleButton value="go">Go</ToggleButton>
            <ToggleButton value="zod">Zod</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            label={t.rootName}
            placeholder={rootPlaceholder}
            value={state.root}
            sx={{ width: 200 }}
            fullWidth={false}
            onChange={onRootChange}
          />
        </>
      }
      input={
        <InputPanel
          label="JSON"
          placeholder={placeholder}
          value={state.input}
          onChange={onInputChange}
        />
      }
      output={
        <OutputPanel
          value={result.ok ? result.output : result.error.excerpt}
          error={result.ok ? null : j.error(result.error.line, result.error.column, result.error)}
          placeholder={outputPlaceholder}
          actions={
            result.ok &&
            result.types > 0 && (
              <Typography variant="body2" color="text.secondary">
                {t.types(result.types)}
              </Typography>
            )
          }
        />
      }
    />
  );
}
