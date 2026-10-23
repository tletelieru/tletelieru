import { useCallback, useMemo, useState, type ChangeEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { useHydrated } from '~/lib/hydration';
import { clampInt } from '~/lib/tools/_shared/lines';
import {
  charSets,
  cryptoRandom,
  generatePasswords,
  passwordEntropy,
  strengthOf,
  type CharSet,
  type PasswordOptions,
  type PasswordResult,
} from '~/lib/tools/password';
import { useUrlState } from '~/lib/url-state';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { passwordMessages } from './messages';

const defaults = {
  mode: 'password',
  length: 20,
  sets: 'lower,upper,digits,symbols',
  ambiguous: false,
  words: 5,
  sep: '-',
  cap: true,
  num: true,
  count: 5,
};

export default function PasswordTool() {
  const t = useMessages(passwordMessages);
  const hydrated = useHydrated();
  const [state, update] = useUrlState(defaults);
  const sets = useMemo(
    () => charSets.filter((set) => state.sets.split(',').includes(set)),
    [state.sets],
  );

  const options = useMemo<PasswordOptions>(
    () => ({
      mode: state.mode === 'passphrase' ? 'passphrase' : 'password',
      length: clampInt(state.length, 4, 256),
      sets,
      excludeAmbiguous: state.ambiguous,
      words: clampInt(state.words, 2, 20),
      separator: state.sep.slice(0, 3),
      capitalize: state.cap,
      addNumber: state.num,
      count: clampInt(state.count, 1, 50),
    }),
    [
      state.mode,
      state.length,
      sets,
      state.ambiguous,
      state.words,
      state.sep,
      state.cap,
      state.num,
      state.count,
    ],
  );

  const automatic = useMemo<PasswordResult | null>(
    () => (hydrated ? generatePasswords(options, cryptoRandom) : null),
    [hydrated, options],
  );
  const [manual, setManual] = useState<{ options: PasswordOptions; result: PasswordResult } | null>(
    null,
  );
  const result = manual && manual.options === options ? manual.result : automatic;
  const entropy = passwordEntropy(options);

  const onRegenerate = useCallback(
    () => setManual({ options, result: generatePasswords(options, cryptoRandom) }),
    [options],
  );

  const onModeChange = useCallback(
    (_: unknown, value: string | null) => {
      if (value) update({ mode: value });
    },
    [update],
  );

  const onSetsChange = useCallback(
    (_: unknown, value: CharSet[]) => update({ sets: value.join(',') }),
    [update],
  );

  const onNumber = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ [event.target.name]: Number(event.target.value) } as Partial<typeof defaults>),
    [update],
  );

  const onSwitch = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      update({ [event.target.name]: event.target.checked } as Partial<typeof defaults>),
    [update],
  );

  const onSeparatorChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ sep: event.target.value }),
    [update],
  );

  const passphrase = options.mode === 'passphrase';

  return (
    <ToolLayout
      options={
        <>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={options.mode}
            onChange={onModeChange}
            aria-label={t.mode}
          >
            <ToggleButton value="password">{t.password}</ToggleButton>
            <ToggleButton value="passphrase">{t.passphrase}</ToggleButton>
          </ToggleButtonGroup>
          {!passphrase && (
            <TextField
              type="number"
              name="length"
              label={t.length}
              value={options.length}
              sx={{ width: 110 }}
              fullWidth={false}
              slotProps={{ htmlInput: { min: 4, max: 256 } }}
              onChange={onNumber}
            />
          )}
          {!passphrase && (
            <ToggleButtonGroup
              size="small"
              value={sets}
              onChange={onSetsChange}
              aria-label={t.sets}
            >
              {charSets.map((set) => (
                <ToggleButton key={set} value={set}>
                  {t[set]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
          {!passphrase && (
            <FormControlLabel
              control={<Switch name="ambiguous" checked={state.ambiguous} onChange={onSwitch} />}
              label={t.ambiguous}
            />
          )}
          {passphrase && (
            <TextField
              type="number"
              name="words"
              label={t.words}
              value={options.words}
              sx={{ width: 110 }}
              fullWidth={false}
              slotProps={{ htmlInput: { min: 2, max: 20 } }}
              onChange={onNumber}
            />
          )}
          {passphrase && (
            <TextField
              label={t.separator}
              value={state.sep}
              sx={{ width: 110 }}
              fullWidth={false}
              slotProps={{ htmlInput: { maxLength: 3 } }}
              onChange={onSeparatorChange}
            />
          )}
          {passphrase && (
            <FormControlLabel
              control={<Switch name="cap" checked={state.cap} onChange={onSwitch} />}
              label={t.capitalize}
            />
          )}
          {passphrase && (
            <FormControlLabel
              control={<Switch name="num" checked={state.num} onChange={onSwitch} />}
              label={t.addNumber}
            />
          )}
          <TextField
            type="number"
            name="count"
            label={t.count}
            value={options.count}
            sx={{ width: 110 }}
            fullWidth={false}
            slotProps={{ htmlInput: { min: 1, max: 50 } }}
            onChange={onNumber}
          />
          <Button variant="contained" onClick={onRegenerate} disabled={!hydrated}>
            {t.regenerate}
          </Button>
        </>
      }
      input={
        <Alert severity="info" role="note">
          {t.privacy}
        </Alert>
      }
      output={
        <OutputPanel
          label={t.outputLabel}
          value={result?.ok ? result.values.join('\n') : ''}
          error={result && !result.ok ? t.noCharsets : null}
          snippet={false}
          actions={
            entropy > 0 && (
              <Typography variant="body2" color="text.secondary">
                {t.entropy(entropy, t.strength[strengthOf(entropy)])}
              </Typography>
            )
          }
        />
      }
    />
  );
}
