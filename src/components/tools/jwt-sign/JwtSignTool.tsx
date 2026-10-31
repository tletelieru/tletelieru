import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { useHydrated } from '~/lib/hydration';
import { clampInt } from '~/lib/tools/_shared/lines';
import { createAsyncCache } from '~/lib/tools/hash/async-cache';
import { isKeyEncoding } from '~/lib/tools/hash';
import { jwsAlgs } from '~/lib/tools/jose/algorithms';
import { SAMPLE_HEADER, SAMPLE_JWT, SAMPLE_PAYLOAD, SAMPLE_SECRET } from '~/lib/tools/jose/samples';
import {
  applyTimeClaims,
  signJwt,
  type SignError,
  type SignInput,
  type SignResult,
  type SignWarning,
} from '~/lib/tools/jwt-sign';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { joseMessages, KeyField } from '../_shared/jose';
import { InputPanel } from '../_shared/InputPanel';
import { SelectOption, SwitchOption, TextOption, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { jwtSignMessages } from './messages';

type Messages = (typeof jwtSignMessages)['en'];
type JoseMessages = (typeof joseMessages)['en'];

const defaults = { alg: 'HS256', encoding: 'text', ttl: '3600' };

const cache = createAsyncCache<SignResult>(8);

const algOptions = jwsAlgs.map((value) => ({ value, label: value }));

function cacheKey(input: SignInput): string {
  return Object.values(input).join('\u0000');
}

function describeError(error: SignError, t: Messages, j: JoseMessages): string {
  if (error.code === 'key') return j.keyFailures[error.failure];
  const side = t.sideNames[error.side];
  if (error.code === 'not-object') return t.notObject(side);
  return t.json(side, error.error.line, error.error.column);
}

function describeWarning(warning: SignWarning, alg: string, t: Messages): string {
  if (warning.code === 'unsigned') return t.unsignedWarning;
  if (warning.code === 'alg-overridden') return t.algOverridden(warning.from, alg);
  return t.weakSecret(warning.bytes, warning.minimum);
}

export default function JwtSignTool() {
  const t = useMessages(jwtSignMessages);
  const j = useMessages(joseMessages);
  const hydrated = useHydrated();
  const [state, update] = useUrlState(defaults);
  const [header, setHeader] = useState('');
  const [payload, setPayload] = useState('');
  const [key, setKey] = useState('');
  const [unsigned, setUnsigned] = useState(false);
  const [badPayload, setBadPayload] = useState(false);
  useSyncExternalStore(cache.subscribe, cache.getVersion, cache.getVersion);

  const alg = pickOption(state.alg, jwsAlgs, 'HS256');
  const encoding = isKeyEncoding(state.encoding) ? state.encoding : 'text';
  const input: SignInput = { header, payload, key, encoding, alg, unsigned };
  const active = hydrated && payload.trim() !== '' && (unsigned || key.trim() !== '');

  const entry = active ? cache.read(cacheKey(input), () => signJwt(input)) : null;
  const result = entry?.status === 'done' ? entry.value : null;
  const token = result?.ok ? result.token : '';
  const warnings = useMemo(() => (result?.ok ? result.warnings : []), [result]);

  let error: string | null = null;
  if (result && !result.ok) error = describeError(result.error, t, j);
  else if (entry?.status === 'error') error = t.failed;

  const applyClaims = useCallback(
    (claims: Parameters<typeof applyTimeClaims>[1]) => {
      const next = applyTimeClaims(payload, claims);
      setBadPayload(next === null);
      if (next !== null) setPayload(next);
    },
    [payload],
  );

  const onSetIat = useCallback(
    () => applyClaims({ iat: Math.floor(Date.now() / 1000) }),
    [applyClaims],
  );

  const onSetExp = useCallback(() => {
    const ttl = clampInt(Number(state.ttl), 0, 315_360_000);
    applyClaims({ exp: Math.floor(Date.now() / 1000) + ttl });
  }, [applyClaims, state.ttl]);

  const onPayload = useCallback((value: string) => {
    setBadPayload(false);
    setPayload(value);
  }, []);

  const onAlg = useSetter(update, 'alg');
  const onTtl = useSetter(update, 'ttl');
  const onEncoding = useCallback((value: string) => update({ encoding: value }), [update]);

  return (
    <ToolLayout
      options={
        <>
          {!unsigned && (
            <SelectOption
              label={t.algorithm}
              value={alg}
              options={algOptions}
              onChange={onAlg}
              width={140}
            />
          )}
          <SwitchOption label={t.unsigned} checked={unsigned} onChange={setUnsigned} />
          <TextOption label={t.ttl} value={state.ttl} onChange={onTtl} width={190} />
          <Button variant="outlined" onClick={onSetIat}>
            {t.setIat}
          </Button>
          <Button variant="outlined" onClick={onSetExp}>
            {t.setExp}
          </Button>
        </>
      }
      input={
        <Stack spacing={2}>
          {unsigned && <Alert severity="error">{t.unsignedWarning}</Alert>}
          {badPayload && <Alert severity="error">{t.badPayload}</Alert>}
          <InputPanel
            label={t.header}
            placeholder={SAMPLE_HEADER}
            value={header}
            onChange={setHeader}
            minRows={2}
            history={false}
          />
          <InputPanel
            label={t.payload}
            placeholder={SAMPLE_PAYLOAD}
            value={payload}
            onChange={onPayload}
            minRows={4}
            history={false}
          />
          {!unsigned && (
            <KeyField
              label={t.key}
              placeholder={SAMPLE_SECRET}
              value={key}
              onChange={setKey}
              encoding={encoding}
              onEncodingChange={onEncoding}
            />
          )}
        </Stack>
      }
      output={
        <Stack spacing={1}>
          {warnings
            .filter((warning) => warning.code !== 'unsigned')
            .map((warning) => (
              <Alert key={warning.code} severity="warning">
                {describeWarning(warning, alg, t)}
              </Alert>
            ))}
          <OutputPanel
            label={unsigned ? t.unsignedToken : t.token}
            value={token}
            error={error}
            placeholder={!unsigned && alg === 'HS256' ? SAMPLE_JWT : undefined}
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
