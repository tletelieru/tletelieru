import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
} from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import {
  algorithmNames,
  decodeKey,
  digestAll,
  encodeDigest,
  hashAlgorithms,
  hashFormats,
  hmacAll,
  isHashAlgorithm,
  isHashFormat,
  isKeyEncoding,
  keyEncodings,
  utf8,
  verifyDigest,
  type Bytes,
  type DigestSet,
  type HashAlgorithm,
  type HashFormat,
  type KeyEncoding,
} from '~/lib/tools/hash';
import { createAsyncCache } from '~/lib/tools/hash/async-cache';
import { formatBytes } from '~/lib/tools/json';
import { useUrlState } from '~/lib/url-state';
import { CopyButton } from '../_shared/CopyButton';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { hashMessages } from './messages';

type Mode = 'hash' | 'hmac' | 'verify';

const modes: Mode[] = ['hash', 'hmac', 'verify'];

const defaults = {
  mode: 'hash',
  algorithm: 'all',
  format: 'hex',
  keyEncoding: 'text',
  input: '',
  expected: '',
};

interface LoadedFile {
  id: number;
  name: string;
  size: number;
  bytes: Bytes;
}

const cache = createAsyncCache<DigestSet>();

const mono = { fontFamily: 'var(--sl-font-mono, ui-monospace, monospace)', fontSize: 14 };

function isMode(value: string): value is Mode {
  return (modes as string[]).includes(value);
}

export default function HashTool() {
  const t = useMessages(hashMessages);
  const [state, update] = useUrlState(defaults);
  const [key, setKey] = useState('');
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [fileError, setFileError] = useState(false);
  const fileCounter = useRef(0);
  useSyncExternalStore(cache.subscribe, cache.getVersion, cache.getVersion);

  const mode: Mode = isMode(state.mode) ? state.mode : 'hash';
  const algorithm: HashAlgorithm | 'all' = isHashAlgorithm(state.algorithm)
    ? state.algorithm
    : 'all';
  const format: HashFormat = isHashFormat(state.format) ? state.format : 'hex';
  const keyEncoding: KeyEncoding = isKeyEncoding(state.keyEncoding) ? state.keyEncoding : 'text';
  const usesKey = mode === 'hmac' || (mode === 'verify' && key !== '');
  const prefix = usesKey ? t.hmacPrefix : '';

  const decodedKey = useMemo(
    () => (usesKey ? decodeKey(key, keyEncoding) : null),
    [usesKey, key, keyEncoding],
  );

  const message = useMemo(() => utf8(state.input), [state.input]);
  const hasSource = file !== null || state.input !== '';

  const cacheKey = useMemo(() => {
    const source = file ? `file:${file.id}` : `text:${state.input}`;
    return usesKey ? `hmac\u0000${keyEncoding}\u0000${key}\u0000${source}` : `hash\u0000${source}`;
  }, [file, state.input, usesKey, keyEncoding, key]);

  const keyBytes = decodedKey?.ok ? decodedKey.bytes : null;
  const keyError = decodedKey && !decodedKey.ok ? t.keyErrors[decodedKey.error] : null;
  const data = file ? file.bytes : message;
  const entry =
    hasSource && !keyError
      ? cache.read(cacheKey, () => (keyBytes ? hmacAll(keyBytes, data) : digestAll(data)))
      : null;
  const digests = entry?.status === 'done' ? entry.value : null;

  const shown = useMemo(
    () => (algorithm === 'all' ? [...hashAlgorithms] : [algorithm]),
    [algorithm],
  );

  const rows = useMemo(
    () =>
      digests
        ? shown.map((name) => ({
            name,
            label: `${prefix}${algorithmNames[name]}`,
            value: encodeDigest(digests[name], format),
          }))
        : [],
    [digests, shown, prefix, format],
  );

  const output = useMemo(() => {
    if (algorithm !== 'all') return rows[0]?.value ?? '';
    const width = Math.max(0, ...rows.map((row) => row.label.length)) + 2;
    return rows.map((row) => `${row.label.padEnd(width)}${row.value}`).join('\n');
  }, [algorithm, rows]);

  const verdict = useMemo(() => {
    if (mode !== 'verify' || !digests) return null;
    const result = verifyDigest(state.expected, digests);
    if (result.status === 'empty') return null;
    if (result.status === 'match') {
      return {
        ok: true,
        text: t.match(`${prefix}${algorithmNames[result.algorithm]}`, t.formatNames[result.format]),
      };
    }
    const names = result.candidates.map((name) => `${prefix}${algorithmNames[name]}`).join(', ');
    return { ok: false, text: names ? t.noMatchFits(names) : t.noMatchLength };
  }, [mode, digests, state.expected, prefix, t]);

  const error = keyError ?? (entry?.status === 'error' ? t.computeError : null);

  const onModeChange = useCallback(
    (_: unknown, value: Mode | null) => {
      if (value) update({ mode: value });
    },
    [update],
  );

  const onAlgorithmChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ algorithm: event.target.value }),
    [update],
  );

  const onFormatChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ format: event.target.value }),
    [update],
  );

  const onKeyEncodingChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ keyEncoding: event.target.value }),
    [update],
  );

  const onKeyChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setKey(event.target.value),
    [],
  );

  const onExpectedChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ expected: event.target.value }),
    [update],
  );

  const onInputChange = useCallback(
    (input: string) => {
      setFile(null);
      update({ input });
    },
    [update],
  );

  const onFile = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const target = event.target;
    const picked = target.files?.[0];
    target.value = '';
    if (!picked) return;
    setFileError(false);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (result === null || typeof result === 'string') return;
      fileCounter.current += 1;
      setFile({
        id: fileCounter.current,
        name: picked.name,
        size: picked.size,
        bytes: new Uint8Array(result),
      });
    };
    reader.onerror = () => setFileError(true);
    reader.readAsArrayBuffer(picked);
  }, []);

  const onClearFile = useCallback(() => setFile(null), []);

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
            {modes.map((value) => (
              <ToggleButton key={value} value={value}>
                {t.modes[value]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <TextField
            select
            label={t.algorithm}
            value={algorithm}
            onChange={onAlgorithmChange}
            sx={{ width: 190 }}
          >
            <MenuItem value="all">{t.allAlgorithms}</MenuItem>
            {hashAlgorithms.map((value) => (
              <MenuItem key={value} value={value}>
                {`${prefix}${algorithmNames[value]}`}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t.format}
            value={format}
            onChange={onFormatChange}
            sx={{ width: 190 }}
          >
            {hashFormats.map((value) => (
              <MenuItem key={value} value={value}>
                {t.formats[value]}
              </MenuItem>
            ))}
          </TextField>
          {mode !== 'hash' && (
            <TextField
              select
              label={t.keyEncoding}
              value={keyEncoding}
              onChange={onKeyEncodingChange}
              sx={{ width: 190 }}
            >
              {keyEncodings.map((value) => (
                <MenuItem key={value} value={value}>
                  {t.keyEncodings[value]}
                </MenuItem>
              ))}
            </TextField>
          )}
        </>
      }
      input={
        <Stack spacing={2}>
          {mode !== 'hash' && (
            <TextField
              label={mode === 'hmac' ? t.key : t.optionalKey}
              value={key}
              onChange={onKeyChange}
              helperText={t.keyHint}
              autoComplete="off"
              slotProps={{ htmlInput: { spellCheck: false, style: mono } }}
            />
          )}
          <InputPanel
            label={mode === 'hash' ? t.inputLabel : t.messageLabel}
            value={state.input}
            onChange={onInputChange}
            minRows={4}
            actions={
              <Button component="label" size="small" variant="outlined">
                {t.chooseFile}
                <input hidden type="file" onChange={onFile} />
              </Button>
            }
          />
          {file && (
            <Alert
              severity="info"
              action={
                <Button color="inherit" size="small" onClick={onClearFile}>
                  {t.clearFile}
                </Button>
              }
            >
              {t.fileLoaded(file.name, formatBytes(file.size))}
            </Alert>
          )}
          {fileError && <Alert severity="error">{t.fileError}</Alert>}
          {mode === 'verify' && (
            <TextField
              label={t.expected}
              value={state.expected}
              onChange={onExpectedChange}
              helperText={t.expectedHint}
              autoComplete="off"
              slotProps={{ htmlInput: { spellCheck: false, style: mono } }}
            />
          )}
        </Stack>
      }
      output={
        <Stack spacing={2}>
          <OutputPanel
            value={output}
            error={error}
            snippet={!usesKey}
            actions={
              <>
                {entry?.status === 'pending' && (
                  <Typography variant="body2" color="text.secondary">
                    {t.computing}
                  </Typography>
                )}
                {verdict && (
                  <Chip
                    size="small"
                    color={verdict.ok ? 'success' : 'error'}
                    label={verdict.text}
                  />
                )}
              </>
            }
          />
          {algorithm === 'all' && rows.length > 0 && (
            <Stack spacing={1}>
              {rows.map((row) => (
                <Stack key={row.name} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ ...mono, minWidth: 110, fontWeight: 600 }}>
                    {row.label}
                  </Typography>
                  <Typography variant="body2" sx={{ ...mono, flexGrow: 1, wordBreak: 'break-all' }}>
                    {row.value}
                  </Typography>
                  <CopyButton text={row.value} label={t.copyRow(row.label)} />
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>
      }
    />
  );
}
