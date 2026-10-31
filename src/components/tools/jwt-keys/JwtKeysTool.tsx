import { useCallback, useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { SAMPLE_PUBLIC_JWK } from '~/lib/tools/jose/samples';
import { convertKey, generateTestKey, testKeyKinds, type TestKey } from '~/lib/tools/jwt-keys';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { joseMessages } from '../_shared/jose';
import { InputPanel } from '../_shared/InputPanel';
import { ChoiceToggle, SelectOption, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { jwtKeysMessages } from './messages';

const modes = ['convert', 'generate'] as const;

const defaults = { mode: 'convert', kind: 'ec-p256' };

interface OutputsProps {
  jwk: string;
  pem: string;
  publicJwk: string;
  publicPem: string;
  jwkPlaceholder?: string;
  pemPlaceholder?: string;
}

function KeyOutputs({
  jwk,
  pem,
  publicJwk,
  publicPem,
  jwkPlaceholder,
  pemPlaceholder,
}: OutputsProps) {
  const t = useMessages(jwtKeysMessages);
  return (
    <>
      <OutputPanel label={t.jwk} value={jwk} placeholder={jwkPlaceholder} snippet={false} />
      <OutputPanel label={t.pem} value={pem} placeholder={pemPlaceholder} snippet={false} />
      {publicJwk !== '' && <OutputPanel label={t.publicJwk} value={publicJwk} snippet={false} />}
      {publicPem !== '' && <OutputPanel label={t.publicPem} value={publicPem} snippet={false} />}
    </>
  );
}

export default function JwtKeysTool() {
  const t = useMessages(jwtKeysMessages);
  const j = useMessages(joseMessages);
  const [state, update] = useUrlState(defaults);
  const [text, setText] = useState('');
  const [generated, setGenerated] = useState<TestKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const runRef = useRef(0);

  const mode = pickOption(state.mode, modes, 'convert');
  const kind = pickOption(state.kind, testKeyKinds, 'ec-p256');

  const converted = useMemo(() => (text.trim() === '' ? null : convertKey(text)), [text]);
  const sample = useMemo(() => convertKey(SAMPLE_PUBLIC_JWK), []);
  const key = converted?.ok ? converted.key : null;

  const onGenerate = useCallback(() => {
    const run = ++runRef.current;
    setBusy(true);
    setFailed(false);
    generateTestKey(kind).then(
      (next) => {
        if (run !== runRef.current) return;
        setGenerated(next);
        setBusy(false);
      },
      () => {
        if (run !== runRef.current) return;
        setFailed(true);
        setBusy(false);
      },
    );
  }, [kind]);

  const onMode = useSetter(update, 'mode');
  const onKind = useSetter(update, 'kind');
  const kindOptions = useMemo(
    () => testKeyKinds.map((value) => ({ value, label: t.kinds[value] })),
    [t],
  );

  const noPem = mode === 'convert' && key !== null && key.pem === '';

  return (
    <ToolLayout
      options={
        <>
          <ChoiceToggle
            label={t.mode}
            value={mode}
            options={modes}
            labels={t.modes}
            onChange={onMode}
          />
          {mode === 'generate' && (
            <SelectOption
              label={t.kind}
              value={kind}
              options={kindOptions}
              onChange={onKind}
              width={170}
            />
          )}
          {mode === 'generate' && (
            <Button variant="contained" onClick={onGenerate} disabled={busy}>
              {busy ? t.generating : t.generate}
            </Button>
          )}
        </>
      }
      input={
        mode === 'convert' && (
          <InputPanel
            label={t.input}
            placeholder={SAMPLE_PUBLIC_JWK}
            value={text}
            onChange={setText}
            minRows={5}
            history={false}
          />
        )
      }
      output={
        <Stack spacing={2}>
          {mode === 'generate' && <Alert severity="warning">{t.testingOnly}</Alert>}
          {failed && mode === 'generate' && <Alert severity="error">{t.failed}</Alert>}
          {mode === 'convert' && converted && !converted.ok && (
            <Alert severity="error">{j.keyFailures[converted.error]}</Alert>
          )}
          {noPem && <Alert severity="info">{t.octNoPem}</Alert>}
          {mode === 'convert' && (
            <KeyOutputs
              jwk={key?.jwk ?? ''}
              pem={key?.pem ?? ''}
              publicJwk={key?.publicJwk ?? ''}
              publicPem={key?.publicPem ?? ''}
              jwkPlaceholder={sample.ok ? sample.key.jwk : undefined}
              pemPlaceholder={sample.ok ? sample.key.pem : undefined}
            />
          )}
          {mode === 'generate' && (
            <KeyOutputs
              jwk={generated?.jwk ?? ''}
              pem={generated?.pem ?? ''}
              publicJwk={generated?.publicJwk ?? ''}
              publicPem={generated?.publicPem ?? ''}
            />
          )}
          {mode === 'generate' && generated !== null && generated.secretHex !== '' && (
            <OutputPanel label={t.secretHex} value={generated.secretHex} snippet={false} />
          )}
          <Typography variant="caption" color="text.secondary">
            {t.privacy}
          </Typography>
        </Stack>
      }
    />
  );
}
