import { useCallback, useMemo } from 'react';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useMessages } from '~/i18n/react';
import { convertCurl, curlTargets, parseCurl } from '~/lib/tools/curl';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { curlMessages } from './messages';

const defaults = { target: 'fetch' };
const secretDefaults = { input: '' };

const placeholder =
  "curl -X POST 'https://api.example.com/v1/orders?dry_run=1' \\\n  -H 'Content-Type: application/json' \\\n  -H 'Authorization: Bearer <token>' \\\n  -d '{\"sku\": \"A-1\", \"qty\": 2}'";

export default function CurlConvertTool() {
  const t = useMessages(curlMessages);
  const [state, update] = useUrlState(defaults);
  const [secret, updateSecret] = useUrlState(secretDefaults, { sync: false });
  const { input } = secret;
  const target = pickOption(state.target, curlTargets, 'fetch');

  const parsed = useMemo(() => (input.trim() ? parseCurl(input) : null), [input]);
  const request = parsed?.ok ? parsed.request : null;
  const output = useMemo(() => (request ? convertCurl(request, target) : ''), [request, target]);

  const outputPlaceholder = useMemo(() => {
    const preview = parseCurl(placeholder);
    return preview.ok ? convertCurl(preview.request, target) : undefined;
  }, [target]);

  const onTargetChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ target: value });
    },
    [update],
  );

  const onInputChange = useCallback(
    (value: string) => updateSecret({ input: value }),
    [updateSecret],
  );

  return (
    <ToolLayout
      options={
        <ToggleButtonGroup
          exclusive
          size="small"
          value={target}
          onChange={onTargetChange}
          aria-label={t.target}
        >
          <ToggleButton value="fetch">fetch</ToggleButton>
          <ToggleButton value="axios">axios</ToggleButton>
          <ToggleButton value="node">Node https</ToggleButton>
          <ToggleButton value="python">Python requests</ToggleButton>
        </ToggleButtonGroup>
      }
      input={
        <Stack spacing={1}>
          <Alert severity="info" role="note">
            {t.privacy}
          </Alert>
          <InputPanel
            label={t.input}
            placeholder={placeholder}
            value={input}
            onChange={onInputChange}
            minRows={4}
            history={false}
          />
        </Stack>
      }
      output={
        <Stack spacing={1}>
          {request && request.ignored.length > 0 && (
            <Alert severity="warning">{t.ignored(request.ignored)}</Alert>
          )}
          {request?.insecure && <Alert severity="warning">{t.insecure}</Alert>}
          <OutputPanel
            value={output}
            error={parsed && !parsed.ok ? t.error(parsed.error) : null}
            placeholder={outputPlaceholder}
            snippet={false}
          />
        </Stack>
      }
    />
  );
}
