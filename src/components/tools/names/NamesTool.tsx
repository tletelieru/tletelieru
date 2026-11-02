import { useCallback, useMemo, type ChangeEvent } from 'react';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { isMultiline } from '~/lib/tools/case';
import {
  apostropheRules,
  conventions,
  defaultNameSettings,
  enyeRules,
  formatAll,
  formatLines,
  hyphenRules,
  nameFormats,
  type NameSettingsInput,
  presets,
  presetStripsAccents,
  resolveNameSettings,
  splitParts,
  splitStrategies,
} from '~/lib/tools/names';
import { useUrlState } from '~/lib/url-state';
import { CaseList } from '../case/CaseList';
import { InputPanel } from '../_shared/InputPanel';
import { SelectOption, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { namesMessages } from './messages';

type State = NameSettingsInput & { input: string };

const defaults: State = { input: '', ...defaultNameSettings };

const placeholder =
  "MARÍA DE LOS ÁNGELES MATUS DE LA PARRA\njuan de la fuente rojas\nbernardo o'higgins riquelme";

function choices<T extends string>(values: readonly T[], labels: Record<T, string>) {
  return values.map((value) => ({ value, label: labels[value] }));
}

export default function NamesTool() {
  const t = useMessages(namesMessages);
  const [state, update] = useUrlState(defaults);
  const settings = useMemo(() => resolveNameSettings(state), [state]);
  const name = state.input.trim();
  const single = name !== '' && !isMultiline(state.input);
  const presetStrips = presetStripsAccents(settings.preset);

  const output = useMemo(() => formatLines(state.input, settings), [state.input, settings]);
  const outputPlaceholder = useMemo(() => formatLines(placeholder, settings), [settings]);
  const allFormats = useMemo(
    () =>
      single
        ? formatAll(name, settings).map((item) => ({ ...item, label: t.formats[item.id] }))
        : null,
    [single, name, settings, t],
  );
  const parts = useMemo(
    () =>
      single
        ? splitParts(name, settings).map((item) => ({ ...item, label: t.partLabels[item.id] }))
        : null,
    [single, name, settings, t],
  );

  const onInputChange = useCallback((value: string) => update({ input: value }), [update]);
  const onFormat = useSetter<State, 'format'>(update, 'format');
  const onStrategy = useSetter<State, 'strategy'>(update, 'strategy');
  const onConvention = useSetter<State, 'convention'>(update, 'convention');
  const onPreset = useSetter<State, 'preset'>(update, 'preset');
  const onEnye = useSetter<State, 'enye'>(update, 'enye');
  const onApostrophe = useSetter<State, 'apostrophe'>(update, 'apostrophe');
  const onHyphen = useSetter<State, 'hyphen'>(update, 'hyphen');
  const onStripAccents = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => update({ stripAccents: event.target.checked }),
    [update],
  );

  return (
    <ToolLayout
      options={
        <>
          <SelectOption
            label={t.format}
            value={settings.format}
            options={choices(nameFormats, t.formats)}
            onChange={onFormat}
            width={240}
          />
          <SelectOption
            label={t.strategy}
            value={settings.strategy}
            options={choices(splitStrategies, t.strategies)}
            onChange={onStrategy}
          />
          <SelectOption
            label={t.convention}
            value={settings.convention}
            options={choices(conventions, t.conventions)}
            onChange={onConvention}
          />
          <SelectOption
            label={t.preset}
            value={settings.preset}
            options={choices(presets, t.presets)}
            onChange={onPreset}
            width={160}
          />
          <SelectOption
            label={t.enye}
            value={settings.enye}
            options={choices(enyeRules, t.enyeRules)}
            onChange={onEnye}
            width={160}
          />
          <SelectOption
            label={t.apostrophe}
            value={settings.apostrophe}
            options={choices(apostropheRules, t.apostropheRules)}
            onChange={onApostrophe}
            width={160}
          />
          <SelectOption
            label={t.hyphen}
            value={settings.hyphen}
            options={choices(hyphenRules, t.hyphenRules)}
            onChange={onHyphen}
            width={160}
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.stripAccents || presetStrips}
                disabled={presetStrips}
                onChange={onStripAccents}
              />
            }
            label={t.removeAccents}
          />
        </>
      }
      input={
        <InputPanel
          label={t.inputLabel}
          placeholder={placeholder}
          value={state.input}
          onChange={onInputChange}
        />
      }
      output={
        <Stack spacing={2}>
          <OutputPanel
            value={output}
            label={t.output(t.formats[settings.format])}
            placeholder={outputPlaceholder}
          />
          {allFormats && (
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t.allFormats}</Typography>
              <CaseList label={t.allFormats} items={allFormats} />
            </Stack>
          )}
          {parts && (
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t.parts}</Typography>
              <CaseList label={t.parts} items={parts} />
            </Stack>
          )}
        </Stack>
      }
    />
  );
}
