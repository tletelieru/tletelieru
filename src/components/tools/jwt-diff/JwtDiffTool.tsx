import { useCallback, useMemo, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useLocale, useMessages } from '~/i18n/react';
import { arrayModes, formatChanges } from '~/lib/tools/json-diff';
import { encodeBase64Url } from '~/lib/tools/jwt';
import { diffJwts, type ClaimTimeChange, type JwtDiff } from '~/lib/tools/jwt-diff';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { describeJwtError, useJwtErrors } from '../_shared/jose';
import { InputPanel } from '../_shared/InputPanel';
import { ChoiceToggle, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { ZonePicker } from '../time/ZonePicker';
import { jwtDiffMessages } from './messages';

type Messages = (typeof jwtDiffMessages)['en'];

const defaults = { arrays: 'index', zone: 'UTC' };

function sampleToken(header: string, payload: string, signature: string): string {
  return [encodeBase64Url(header), encodeBase64Url(payload), signature].join('.');
}

const SAMPLE_LEFT = sampleToken(
  '{"alg":"HS256","typ":"JWT"}',
  '{"sub":"user-1","role":"viewer","exp":1700003600}',
  'ZmFrZS1h',
);
const SAMPLE_RIGHT = sampleToken(
  '{"alg":"RS256","typ":"JWT"}',
  '{"sub":"user-1","role":"admin","exp":1700090000}',
  'ZmFrZS1i',
);

function formatTime(change: ClaimTimeChange, t: Messages): string {
  const side = (time: ClaimTimeChange['left']) =>
    time ? `${time.utc} (${time.zoned})` : t.missing;
  const delta = change.deltaSeconds === null ? '' : ` [${t.delta(change.deltaSeconds)}]`;
  return `${change.claim}: ${side(change.left)} → ${side(change.right)}${delta}`;
}

function formatDiff(diff: JwtDiff, t: Messages): string {
  const sections: string[] = [];
  if (diff.header.length > 0) sections.push(`${t.header}\n${formatChanges(diff.header)}`);
  if (diff.payload.length > 0) sections.push(`${t.payload}\n${formatChanges(diff.payload)}`);
  if (diff.times.length > 0) {
    sections.push(`${t.dates}\n${diff.times.map((change) => formatTime(change, t)).join('\n')}`);
  }
  if (sections.length === 0) sections.push(t.identical);
  sections.push(diff.signatureChanged ? t.signatureChanged : t.signatureSame);
  return sections.join('\n\n');
}

export default function JwtDiffTool() {
  const t = useMessages(jwtDiffMessages);
  const jwtText = useJwtErrors();
  const locale = useLocale();
  const [state, update] = useUrlState(defaults);
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const arrays = pickOption(state.arrays, arrayModes, 'index');
  const active = left.trim() !== '' && right.trim() !== '';

  const result = useMemo(
    () => (active ? diffJwts(left, right, arrays, state.zone, locale) : null),
    [active, left, right, arrays, state.zone, locale],
  );

  const output = result?.ok ? formatDiff(result.diff, t) : '';
  const error =
    result && !result.ok
      ? `${t.side(result.side)} · ${describeJwtError(result.error, jwtText)}`
      : null;

  const placeholder = useMemo(() => {
    const sample = diffJwts(SAMPLE_LEFT, SAMPLE_RIGHT, 'index', 'UTC', locale);
    return sample.ok ? formatDiff(sample.diff, t) : undefined;
  }, [t, locale]);

  const onArrays = useSetter(update, 'arrays');
  const onZone = useCallback((zone: string) => update({ zone }), [update]);

  return (
    <ToolLayout
      options={
        <>
          <ChoiceToggle
            label={t.arrays}
            value={arrays}
            options={arrayModes}
            labels={{ index: t.byIndex, set: t.asSet }}
            onChange={onArrays}
          />
          <ZonePicker label={t.zone} value={state.zone} onChange={onZone} />
        </>
      }
      input={
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ '& > *': { flex: 1, minWidth: 0 } }}
        >
          <InputPanel
            label={t.left}
            placeholder={SAMPLE_LEFT}
            value={left}
            onChange={setLeft}
            minRows={4}
            history={false}
          />
          <InputPanel
            label={t.right}
            placeholder={SAMPLE_RIGHT}
            value={right}
            onChange={setRight}
            minRows={4}
            history={false}
          />
        </Stack>
      }
      output={
        <Stack spacing={1}>
          <OutputPanel
            label={t.changes}
            value={output}
            error={error}
            placeholder={placeholder}
            snippet={false}
          />
          <Typography variant="caption" color="text.secondary">
            {t.privacy}
          </Typography>
        </Stack>
      }
    />
  );
}
