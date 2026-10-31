import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { isKeyEncoding } from '~/lib/tools/hash';
import { encodeBase64Url } from '~/lib/tools/jwt';
import { lintJwt, type LintFinding } from '~/lib/tools/jwt-lint';
import { clock } from '~/lib/tools/totp-clock';
import { useUrlState } from '~/lib/url-state';
import { describeJwtError, joseMessages, KeyField, useJwtErrors } from '../_shared/jose';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { jwtLintMessages } from './messages';

type Messages = (typeof jwtLintMessages)['en'];
type JoseMessages = (typeof joseMessages)['en'];

const defaults = { encoding: 'text' };

const SAMPLE_TOKEN = [
  encodeBase64Url('{"alg":"none","jku":"https://keys.example/jwks.json"}'),
  encodeBase64Url('{"sub":"user-1","password":"fake","iat":1700000000}'),
  '',
].join('.');

function describeFinding(finding: LintFinding, t: Messages, j: JoseMessages): string {
  const f = t.findings;
  switch (finding.code) {
    case 'alg-none':
      return f.algNone;
    case 'alg-missing':
      return f.algMissing;
    case 'alg-unknown':
      return f.algUnknown(finding.alg);
    case 'alg-hs-public-key':
      return f.algHsPublicKey;
    case 'alg-asymmetric-secret':
      return f.algAsymmetricSecret;
    case 'alg-key-family':
      return f.algKeyFamily(finding.alg, finding.kty);
    case 'alg-hs-hint':
      return f.algHsHint;
    case 'key-unreadable':
      return f.keyUnreadable(j.keyFailures[finding.failure]);
    case 'weak-hs-key':
      return f.weakHsKey(finding.bytes, finding.minimum);
    case 'weak-rsa-key':
      return f.weakRsaKey(finding.bits);
    case 'missing-exp':
      return f.missingExp;
    case 'long-lifetime':
      return f.longLifetime(finding.days);
    case 'exp-before-iat':
      return f.expBeforeIat;
    case 'nbf-after-exp':
      return f.nbfAfterExp;
    case 'invalid-claim':
      return f.invalidClaim(finding.claim);
    case 'expired':
      return f.expired;
    case 'iat-future':
      return f.iatFuture;
    case 'sensitive-keys':
      return f.sensitiveKeys(finding.keys.join(', '));
    case 'header-jku':
      return f.headerJku(finding.value);
    case 'header-x5u':
      return f.headerX5u(finding.value);
    case 'header-jwk':
      return f.headerJwk;
    case 'header-x5c':
      return f.headerX5c;
    case 'header-crit':
      return f.headerCrit;
    case 'header-kid':
      return f.headerKid(finding.value);
    case 'kid-traversal':
      return f.kidTraversal(finding.value);
    case 'kid-injection':
      return f.kidInjection(finding.value);
    case 'kid-url':
      return f.kidUrl(finding.value);
  }
}

function formatFindings(findings: LintFinding[], t: Messages, j: JoseMessages): string {
  if (findings.length === 0) return t.none;
  return findings
    .map((finding) => `[${t.severities[finding.severity]}] ${describeFinding(finding, t, j)}`)
    .join('\n');
}

export default function JwtLintTool() {
  const t = useMessages(jwtLintMessages);
  const j = useMessages(joseMessages);
  const jwtText = useJwtErrors();
  const [state, update] = useUrlState(defaults);
  const [token, setToken] = useState('');
  const [key, setKey] = useState('');
  const clockNow = useSyncExternalStore(clock.subscribe, clock.now, clock.server);

  const encoding = isKeyEncoding(state.encoding) ? state.encoding : 'text';
  const now = clockNow > 0 ? clockNow : null;
  const minuteNow = now === null ? null : Math.floor(now / 60_000) * 60_000;

  const result = useMemo(
    () => (token.trim() === '' ? null : lintJwt({ token, key, encoding, now: minuteNow })),
    [token, key, encoding, minuteNow],
  );

  const output = result?.ok ? formatFindings(result.findings, t, j) : '';
  const error = result && !result.ok ? describeJwtError(result.error, jwtText) : null;

  const placeholder = useMemo(() => {
    const sample = lintJwt({ token: SAMPLE_TOKEN, key: '', encoding: 'text', now: null });
    return sample.ok ? formatFindings(sample.findings, t, j) : undefined;
  }, [t, j]);

  const onEncoding = useCallback((value: string) => update({ encoding: value }), [update]);

  return (
    <ToolLayout
      input={
        <Stack spacing={2}>
          <InputPanel
            label={t.token}
            placeholder={SAMPLE_TOKEN}
            value={token}
            onChange={setToken}
            minRows={3}
            history={false}
          />
          <KeyField
            label={t.key}
            value={key}
            onChange={setKey}
            encoding={encoding}
            onEncodingChange={onEncoding}
          />
        </Stack>
      }
      output={
        <Stack spacing={1}>
          <OutputPanel
            label={t.result}
            value={output}
            error={error}
            placeholder={placeholder}
            snippet={false}
            actions={
              result?.ok && (
                <Typography variant="body2" color="text.secondary">
                  {t.summary(result.findings.length)}
                </Typography>
              )
            }
          />
          <Typography variant="caption" color="text.secondary">
            {t.privacy}
          </Typography>
        </Stack>
      }
    />
  );
}
