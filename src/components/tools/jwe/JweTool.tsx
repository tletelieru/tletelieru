import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { useHydrated } from '~/lib/hydration';
import { createAsyncCache } from '~/lib/tools/hash/async-cache';
import { isKeyEncoding } from '~/lib/tools/hash';
import { SAMPLE_JWE, SAMPLE_JWE_KEY } from '~/lib/tools/jose/samples';
import {
  decryptJwe,
  inspectJwe,
  jweParts,
  type JweDecryptResult,
  type JweError,
  type JweInspection,
  type JweSupport,
} from '~/lib/tools/jwe';
import { useUrlState } from '~/lib/url-state';
import { joseMessages, KeyField } from '../_shared/jose';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { jweMessages } from './messages';

type Messages = (typeof jweMessages)['en'];

const defaults = { encoding: 'text' };

const cache = createAsyncCache<JweDecryptResult>(8);

function describeError(error: JweError, t: Messages): string {
  switch (error.code) {
    case 'empty':
      return '';
    case 'jws':
      return t.errors.jws;
    case 'segments':
      return t.errors.segments(error.count);
    case 'base64':
      return t.errors.base64(t.parts[error.part]);
    case 'utf8':
      return t.errors.utf8;
    case 'json':
      return t.errors.json(error.detail.line, error.detail.column);
    case 'not-object':
      return t.errors.notObject;
    case 'missing-alg':
      return t.errors.missingAlg;
    case 'missing-enc':
      return t.errors.missingEnc;
  }
}

function describeSupport(support: JweSupport, t: Messages): string | null {
  return support.supported ? null : t.unsupported[support.field](support.value);
}

function formatStructure(jwe: JweInspection, t: Messages): string {
  const lines = [`alg: ${jwe.alg}`, `enc: ${jwe.enc}`];
  if (jwe.kid !== null) lines.push(`kid: ${jwe.kid}`);
  for (const part of jweParts) lines.push(t.bytes(t.parts[part], jwe.bytes[part].length));
  return lines.join('\n');
}

export default function JweTool() {
  const t = useMessages(jweMessages);
  const j = useMessages(joseMessages);
  const hydrated = useHydrated();
  const [state, update] = useUrlState(defaults);
  const [token, setToken] = useState('');
  const [key, setKey] = useState('');
  useSyncExternalStore(cache.subscribe, cache.getVersion, cache.getVersion);

  const encoding = isKeyEncoding(state.encoding) ? state.encoding : 'text';
  const inspected = useMemo(() => (token.trim() === '' ? null : inspectJwe(token)), [token]);
  const jwe = inspected?.ok ? inspected.jwe : null;
  const inspectError = inspected && !inspected.ok ? describeError(inspected.error, t) : null;
  const unsupported = jwe ? describeSupport(jwe.support, t) : null;

  const canDecrypt = hydrated && jwe !== null && jwe.support.supported && key.trim() !== '';
  const entry =
    canDecrypt && jwe
      ? cache.read([token, key, encoding].join('\u0000'), () => decryptJwe(jwe, key, encoding))
      : null;
  const decrypted = entry?.status === 'done' ? entry.value : null;
  const plain = decrypted?.ok ? decrypted : null;

  const failures = { ...j.keyFailures, ...t.failures };
  let decryptError: string | null = null;
  if (decrypted && !decrypted.ok) decryptError = failures[decrypted.failure];
  else if (entry?.status === 'error') decryptError = t.failures.decrypt;

  const sample = useMemo(() => {
    const result = inspectJwe(SAMPLE_JWE);
    return result.ok ? result.jwe : null;
  }, []);

  const onEncoding = useCallback((value: string) => update({ encoding: value }), [update]);

  return (
    <ToolLayout
      input={
        <Stack spacing={2}>
          <InputPanel
            label={t.token}
            placeholder={SAMPLE_JWE}
            value={token}
            onChange={setToken}
            minRows={4}
            history={false}
          />
          <KeyField
            label={t.key}
            placeholder={SAMPLE_JWE_KEY}
            value={key}
            onChange={setKey}
            encoding={encoding}
            onEncodingChange={onEncoding}
          />
        </Stack>
      }
      output={
        <Stack spacing={2}>
          {unsupported !== null && <Alert severity="warning">{unsupported}</Alert>}
          {jwe?.nestedHint && <Alert severity="info">{t.nestedHint}</Alert>}
          <OutputPanel
            label={t.structure}
            value={jwe ? formatStructure(jwe, t) : ''}
            error={inspectError}
            placeholder={sample ? formatStructure(sample, t) : undefined}
            snippet={false}
          />
          <OutputPanel
            label={t.header}
            value={jwe?.headerJson ?? ''}
            placeholder={sample?.headerJson}
            snippet={false}
          />
          {plain && <Alert severity="success">{t.decrypted}</Alert>}
          {plain?.binary && <Alert severity="info">{t.binary}</Alert>}
          {plain?.nested && <Alert severity="warning">{t.nestedFound}</Alert>}
          {plain?.nested && (
            <OutputPanel label={t.nestedHeader} value={plain.nested.headerJson} snippet={false} />
          )}
          {plain?.nested && (
            <OutputPanel label={t.nestedPayload} value={plain.nested.payloadJson} snippet={false} />
          )}
          <OutputPanel
            label={t.plaintext}
            value={plain?.text ?? ''}
            error={decryptError}
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
