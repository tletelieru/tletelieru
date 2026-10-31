import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { useHydrated } from '~/lib/hydration';
import { createAsyncCache } from '~/lib/tools/hash/async-cache';
import { isKeyEncoding } from '~/lib/tools/hash';
import { SAMPLE_JWT, SAMPLE_SECRET } from '~/lib/tools/jose/samples';
import {
  expectedAlgs,
  verifyJwt,
  type VerifyInput,
  type VerifyResult,
  type VerifyWarning,
} from '~/lib/tools/jwt-verify';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { describeJwtError, joseMessages, KeyField, useJwtErrors } from '../_shared/jose';
import { InputPanel } from '../_shared/InputPanel';
import { SelectOption, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { jwtVerifyMessages } from './messages';

type Messages = (typeof jwtVerifyMessages)['en'];
type JoseMessages = (typeof joseMessages)['en'];
type JwtMessages = ReturnType<typeof useJwtErrors>;

const defaults = { alg: 'auto', encoding: 'text' };

const cache = createAsyncCache<VerifyResult>(8);

const SAMPLE_INPUT: VerifyInput = {
  token: SAMPLE_JWT,
  key: SAMPLE_SECRET,
  encoding: 'text',
  expectedAlg: 'auto',
};

function cacheKey(input: VerifyInput): string {
  return Object.values(input).join('\u0000');
}

function describeResult(
  result: VerifyResult,
  t: Messages,
  j: JoseMessages,
  jwtText: JwtMessages,
): { value: string; error: string | null } {
  if (result.status === 'malformed') {
    return { value: t.invalid, error: describeJwtError(result.error, jwtText) };
  }
  if (result.status === 'invalid') {
    const failures = { ...j.keyFailures, ...t.failures };
    return { value: t.invalid, error: failures[result.reason] };
  }
  const lines = [t.valid, t.lineAlg(result.alg), t.lineKey(j.sources[result.source])];
  if (result.kid !== null) lines.push(t.lineKid(result.kid));
  return { value: lines.join('\n'), error: null };
}

function describeWarning(warning: VerifyWarning, t: Messages): string {
  return warning.code === 'weak-secret'
    ? t.weakSecret(warning.bytes, warning.minimum)
    : t.privateKey;
}

export default function JwtVerifyTool() {
  const t = useMessages(jwtVerifyMessages);
  const j = useMessages(joseMessages);
  const jwtText = useJwtErrors();
  const hydrated = useHydrated();
  const [state, update] = useUrlState(defaults);
  const [token, setToken] = useState('');
  const [key, setKey] = useState('');
  useSyncExternalStore(cache.subscribe, cache.getVersion, cache.getVersion);

  const expectedAlg = pickOption(state.alg, expectedAlgs, 'auto');
  const encoding = isKeyEncoding(state.encoding) ? state.encoding : 'text';
  const input: VerifyInput = { token, key, encoding, expectedAlg };
  const active = hydrated && token.trim() !== '';

  const entry = active ? cache.read(cacheKey(input), () => verifyJwt(input)) : null;
  const sampleEntry = hydrated
    ? cache.read(cacheKey(SAMPLE_INPUT), () => verifyJwt(SAMPLE_INPUT))
    : null;

  const result = entry?.status === 'done' ? entry.value : null;
  const crashed = entry?.status === 'error';
  const shown = result ? describeResult(result, t, j, jwtText) : { value: '', error: null };
  const preview =
    sampleEntry?.status === 'done'
      ? describeResult(sampleEntry.value, t, j, jwtText).value
      : undefined;

  const algOptions = useMemo(
    () => expectedAlgs.map((value) => ({ value, label: value === 'auto' ? t.auto : value })),
    [t],
  );

  const onAlg = useSetter(update, 'alg');
  const onEncoding = useCallback((value: string) => update({ encoding: value }), [update]);

  return (
    <ToolLayout
      options={
        <SelectOption
          label={t.expectedAlg}
          value={expectedAlg}
          options={algOptions}
          onChange={onAlg}
          width={300}
        />
      }
      input={
        <Stack spacing={2}>
          <InputPanel
            label={t.token}
            placeholder={SAMPLE_JWT}
            value={token}
            onChange={setToken}
            minRows={3}
            history={false}
          />
          <KeyField
            label={t.key}
            placeholder={SAMPLE_SECRET}
            value={key}
            onChange={setKey}
            encoding={encoding}
            onEncodingChange={onEncoding}
          />
        </Stack>
      }
      output={
        <Stack spacing={1}>
          {result?.status === 'valid' && <Alert severity="success">{t.valid}</Alert>}
          {crashed && <Alert severity="error">{t.invalid}</Alert>}
          {result?.status === 'valid' &&
            result.warnings.map((warning) => (
              <Alert key={warning.code} severity="warning">
                {describeWarning(warning, t)}
              </Alert>
            ))}
          <OutputPanel
            label={t.result}
            value={shown.value}
            error={shown.error}
            placeholder={preview}
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
