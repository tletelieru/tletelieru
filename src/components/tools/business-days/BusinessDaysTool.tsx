import { useCallback, useMemo } from 'react';
import { useMessages } from '~/i18n/react';
import { clampInt } from '~/lib/tools/_shared/lines';
import {
  businessModes,
  processBusinessDays,
  type BusinessLine,
  type BusinessOptions,
} from '~/lib/tools/business-days';
import { calendarCountries, formatEpochDay, weekday, type Holiday } from '~/lib/tools/holidays';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { ChoiceToggle, SwitchOption, TextOption, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { businessDaysMessages } from './messages';

type Messages = (typeof businessDaysMessages)['en'];

const defaults = { input: '', mode: 'add', country: 'CL', days: '5', includeStart: false };

const PLACEHOLDERS = {
  add: '2026-09-15\n2026-12-23',
  count: '2026-09-14 2026-09-24',
};

function dated(day: number, t: Messages): string {
  return `${formatEpochDay(day)} (${t.weekdays[weekday(day)]})`;
}

function holidayLines(holidays: readonly Holiday[], t: Messages): string[] {
  return holidays.map(({ day, id }) => `  ${dated(day, t)} ${t.holidays[id]}`);
}

function describe(line: BusinessLine, t: Messages): string {
  if (!line.ok) return '';
  if (line.kind === 'add') {
    const sign = line.amount < 0 ? '−' : '+';
    const head = `${dated(line.start, t)} ${sign}${Math.abs(line.amount)} → ${dated(line.day, t)}`;
    return [head, ...holidayLines(line.skipped, t)].join('\n');
  }
  const head = `${formatEpochDay(line.from)} → ${formatEpochDay(line.to)}: ${t.businessDays(line.business)} · ${t.calendarDays(line.calendar)}`;
  return [head, ...holidayLines(line.holidays, t)].join('\n');
}

function report(lines: readonly BusinessLine[], t: Messages): string {
  return lines
    .filter((line) => line.ok)
    .map((line) => describe(line, t))
    .join('\n');
}

export default function BusinessDaysTool() {
  const t = useMessages(businessDaysMessages);
  const [state, update] = useUrlState(defaults);
  const mode = pickOption(state.mode, businessModes, 'add');
  const country = pickOption(state.country, calendarCountries, 'CL');

  const options: BusinessOptions = useMemo(
    () => ({
      mode,
      country,
      days: clampInt(Number(state.days), -6000, 6000),
      includeStart: state.includeStart,
    }),
    [mode, country, state.days, state.includeStart],
  );

  const lines = useMemo(() => processBusinessDays(state.input, options), [state.input, options]);
  const preview = useMemo(
    () => report(processBusinessDays(PLACEHOLDERS[mode], options), t),
    [mode, options, t],
  );
  const errors = lines.flatMap((line) =>
    line.ok ? [] : [t.error(line.error, line.line, line.text)],
  );

  const onInput = useCallback((input: string) => update({ input }), [update]);
  const onMode = useSetter(update, 'mode');
  const onCountry = useSetter(update, 'country');
  const onDays = useSetter(update, 'days');
  const onIncludeStart = useSetter(update, 'includeStart');

  return (
    <ToolLayout
      options={
        <>
          <ChoiceToggle
            label={t.mode}
            value={mode}
            options={businessModes}
            labels={t.modes}
            onChange={onMode}
          />
          <ChoiceToggle
            label={t.country}
            value={country}
            options={calendarCountries}
            labels={t.countries}
            onChange={onCountry}
          />
          {mode === 'add' && (
            <TextOption label={t.days} value={state.days} onChange={onDays} width={150} />
          )}
          {mode === 'count' && (
            <SwitchOption
              label={t.includeStart}
              checked={state.includeStart}
              onChange={onIncludeStart}
            />
          )}
        </>
      }
      input={
        <InputPanel
          label={mode === 'add' ? t.dates : t.pairs}
          placeholder={PLACEHOLDERS[mode]}
          value={state.input}
          onChange={onInput}
          minRows={4}
        />
      }
      output={
        <OutputPanel
          value={report(lines, t)}
          placeholder={preview}
          error={errors.length > 0 ? errors.join(' · ') : null}
        />
      }
    />
  );
}
