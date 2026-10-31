import { useCallback, useMemo } from 'react';
import { useLocale, useMessages } from '~/i18n/react';
import { useHydrated } from '~/lib/hydration';
import { clampInt } from '~/lib/tools/_shared/lines';
import { currencyOptions, findCurrency } from '~/lib/tools/iso-4217';
import {
  convertNumbers,
  formatLocalized,
  numberLocales,
  numberModes,
  numberStyles,
  type NumberOptions,
} from '~/lib/tools/number-locale';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { ChoiceToggle, SelectOption, TextOption, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { numberLocaleMessages } from './messages';

const defaults = {
  input: '',
  mode: 'format',
  locale: 'es-CL',
  style: 'plain',
  currency: 'CLP',
  decimals: '',
};

const SAMPLE = '1234567.891';
const localeChoices = numberLocales.map((value) => ({ value, label: value }));

export default function NumberLocaleTool() {
  const t = useMessages(numberLocaleMessages);
  const uiLocale = useLocale();
  const hydrated = useHydrated();
  const [state, update] = useUrlState(defaults);
  const mode = pickOption(state.mode, numberModes, 'format');
  const style = pickOption(state.style, numberStyles, 'plain');
  const locale = pickOption(state.locale, numberLocales, 'es-CL');
  const currency = findCurrency(state.currency)?.code ?? 'CLP';

  const options: NumberOptions = useMemo(
    () => ({
      locale,
      style,
      currency,
      decimals: state.decimals.trim() === '' ? null : clampInt(Number(state.decimals), 0, 20),
    }),
    [locale, style, currency, state.decimals],
  );

  const result = useMemo(
    () => (hydrated ? convertNumbers(state.input, mode, options) : { output: '', errors: [] }),
    [hydrated, state.input, mode, options],
  );

  const placeholder = useMemo(() => {
    if (mode === 'format') return SAMPLE;
    return hydrated ? (formatLocalized(SAMPLE, { ...options, style: 'plain' }) ?? '') : undefined;
  }, [hydrated, mode, options]);

  const preview = useMemo(
    () =>
      hydrated && placeholder !== undefined
        ? convertNumbers(placeholder, mode, options).output
        : undefined,
    [hydrated, placeholder, mode, options],
  );

  const choices = useMemo(() => currencyOptions(uiLocale), [uiLocale]);
  const onInput = useCallback((input: string) => update({ input }), [update]);
  const onMode = useSetter(update, 'mode');
  const onStyle = useSetter(update, 'style');
  const onLocale = useSetter(update, 'locale');
  const onCurrency = useSetter(update, 'currency');
  const onDecimals = useSetter(update, 'decimals');

  return (
    <ToolLayout
      options={
        <>
          <ChoiceToggle
            label={t.mode}
            value={mode}
            options={numberModes}
            labels={t.modes}
            onChange={onMode}
          />
          <SelectOption
            label={t.locale}
            value={locale}
            options={localeChoices}
            onChange={onLocale}
            width={190}
          />
          {mode === 'format' && (
            <ChoiceToggle
              label={t.style}
              value={style}
              options={numberStyles}
              labels={t.styles}
              onChange={onStyle}
            />
          )}
          {mode === 'format' && style === 'currency' && (
            <SelectOption
              label={t.currency}
              value={currency}
              options={choices}
              onChange={onCurrency}
              width={260}
            />
          )}
          {mode === 'format' && (
            <TextOption
              label={t.decimals}
              value={state.decimals}
              onChange={onDecimals}
              width={170}
            />
          )}
        </>
      }
      input={
        <InputPanel
          label={mode === 'format' ? t.numbers : t.localized}
          placeholder={placeholder}
          value={state.input}
          onChange={onInput}
        />
      }
      output={
        <OutputPanel
          value={result.output}
          placeholder={preview}
          error={
            result.errors.length > 0
              ? result.errors
                  .map(({ line, text }) => t.error(line, text, mode === 'parse'))
                  .join(' · ')
              : null
          }
        />
      }
    />
  );
}
