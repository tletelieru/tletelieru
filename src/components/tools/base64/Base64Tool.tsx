import { useCallback, useMemo, useState, type ChangeEvent } from 'react';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import {
  DEFAULT_MIME,
  base64Alphabets,
  bytesToUtf8,
  decodeInput,
  encodeBytes,
  encodeText,
  fileNameFor,
  toDataUri,
  utf8Length,
  type Base64Alphabet,
  type Base64DecodeError,
} from '~/lib/tools/base64';
import { formatBytes } from '~/lib/tools/json';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { base64Messages } from './messages';

type Mode = 'encode' | 'decode' | 'file';
type FileOutput = 'base64' | 'dataUri';

type Base64Messages = (typeof base64Messages)['en'];

interface PickedFile {
  name: string;
  type: string;
  bytes: Uint8Array;
}

const modes: Mode[] = ['encode', 'decode', 'file'];
const fileOutputs: FileOutput[] = ['base64', 'dataUri'];

const defaults = {
  mode: 'encode',
  input: '',
  alphabet: 'standard',
  padding: true,
  wrap: false,
  fileOutput: 'base64',
};

function describeError(error: Base64DecodeError, t: Base64Messages): string {
  if (error.code === 'invalidChar') return t.errors.invalidChar(error.position, error.char);
  return t.errors[error.code];
}

export default function Base64Tool() {
  const t = useMessages(base64Messages);
  const [state, update] = useUrlState(defaults);
  const [file, setFile] = useState<PickedFile | null>(null);
  const mode: Mode = modes.includes(state.mode as Mode) ? (state.mode as Mode) : 'encode';
  const alphabet: Base64Alphabet = (base64Alphabets as readonly string[]).includes(state.alphabet)
    ? (state.alphabet as Base64Alphabet)
    : 'standard';
  const fileOutput: FileOutput = state.fileOutput === 'dataUri' ? 'dataUri' : 'base64';
  const encodeOptions = useMemo(
    () => ({ alphabet, padding: state.padding, wrap: state.wrap }),
    [alphabet, state.padding, state.wrap],
  );

  const decoded = useMemo(
    () => (mode === 'decode' && state.input.trim() ? decodeInput(state.input) : null),
    [mode, state.input],
  );

  const decodedText = useMemo(() => (decoded?.ok ? bytesToUtf8(decoded.bytes) : null), [decoded]);

  const output = useMemo(() => {
    if (mode === 'encode') return encodeText(state.input, encodeOptions);
    if (mode === 'decode') return decodedText ?? '';
    if (!file) return '';
    if (fileOutput === 'dataUri') return toDataUri(encodeBytes(file.bytes), file.type);
    return encodeBytes(file.bytes, encodeOptions);
  }, [mode, state.input, encodeOptions, decodedText, file, fileOutput]);

  const error = useMemo(() => {
    if (!decoded) return null;
    if (!decoded.ok) return describeError(decoded.error, t);
    return decodedText === null ? t.errors.utf8 : null;
  }, [decoded, decodedText, t]);

  const sizes = useMemo(() => {
    if (mode === 'encode') {
      return state.input
        ? t.sizes(formatBytes(utf8Length(state.input)), formatBytes(output.length))
        : '';
    }
    if (mode === 'decode') {
      return decoded?.ok
        ? t.sizes(formatBytes(utf8Length(state.input.trim())), formatBytes(decoded.bytes.length))
        : '';
    }
    return file ? t.sizes(formatBytes(file.bytes.length), formatBytes(output.length)) : '';
  }, [mode, state.input, output, decoded, file, t]);

  const onModeChange = useCallback(
    (_: unknown, value: Mode | null) => {
      if (value) update({ mode: value });
    },
    [update],
  );

  const onAlphabetChange = useCallback(
    (_: unknown, value: Base64Alphabet | null) => {
      if (value) update({ alphabet: value });
    },
    [update],
  );

  const onFileOutputChange = useCallback(
    (_: unknown, value: FileOutput | null) => {
      if (value) update({ fileOutput: value });
    },
    [update],
  );

  const onPaddingChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ padding: event.target.checked }),
    [update],
  );

  const onWrapChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ wrap: event.target.checked }),
    [update],
  );

  const onInputChange = useCallback((input: string) => update({ input }), [update]);

  const onFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    if (!picked) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        setFile({
          name: picked.name,
          type: picked.type || DEFAULT_MIME,
          bytes: new Uint8Array(reader.result),
        });
      }
    };
    reader.readAsArrayBuffer(picked);
    event.target.value = '';
  }, []);

  const onDownload = useCallback(() => {
    if (!decoded?.ok) return;
    const blob = new Blob([decoded.bytes.slice()], { type: decoded.mime ?? DEFAULT_MIME });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileNameFor(decoded.mime);
    link.click();
    URL.revokeObjectURL(url);
  }, [decoded]);

  const encodes = mode === 'encode' || (mode === 'file' && fileOutput === 'base64');

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
                {t[value]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {mode === 'file' && (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={fileOutput}
              onChange={onFileOutputChange}
              aria-label={t.fileOutput}
            >
              {fileOutputs.map((value) => (
                <ToggleButton key={value} value={value} sx={{ textTransform: 'none' }}>
                  {t.fileOutputName[value]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
          {encodes && (
            <>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={alphabet}
                onChange={onAlphabetChange}
                aria-label={t.alphabet}
              >
                {base64Alphabets.map((value) => (
                  <ToggleButton key={value} value={value} sx={{ textTransform: 'none' }}>
                    {t.alphabetName[value]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <FormControlLabel
                control={<Switch checked={state.padding} onChange={onPaddingChange} />}
                label={t.padding}
              />
              <FormControlLabel
                control={<Switch checked={state.wrap} onChange={onWrapChange} />}
                label={t.wrap}
              />
            </>
          )}
        </>
      }
      input={
        mode === 'file' ? (
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Button variant="outlined" component="label">
              {t.pickFile}
              <input type="file" hidden aria-label={t.pickFile} onChange={onFileChange} />
            </Button>
            <Typography variant="body2" color="text.secondary">
              {file ? t.fileInfo(file.name, file.type, formatBytes(file.bytes.length)) : t.noFile}
            </Typography>
          </Stack>
        ) : (
          <InputPanel
            label={mode === 'encode' ? t.encodeLabel : t.decodeLabel}
            placeholder={mode === 'encode' ? 'Hello, ñandú ✓' : 'SGVsbG8sIMOxYW5kw7og4pyT'}
            value={state.input}
            onChange={onInputChange}
          />
        )
      }
      output={
        <OutputPanel
          value={output}
          error={error}
          actions={
            <>
              {sizes && (
                <Typography variant="body2" color="text.secondary">
                  {sizes}
                </Typography>
              )}
              {decoded?.ok && decoded.bytes.length > 0 && (
                <Button size="small" onClick={onDownload}>
                  {t.download}
                </Button>
              )}
            </>
          }
        />
      }
    />
  );
}
