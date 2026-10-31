import { useCallback, useMemo } from 'react';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { pickOption } from '~/lib/tools/sql/format';
import { parseMt, type MtField, type MtMessage } from '~/lib/tools/swift-mt';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { ChoiceToggle, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { swiftMtMessages } from './messages';

type Messages = (typeof swiftMtMessages)['en'];

const views = ['labels', 'json'] as const;
const defaults = { input: '', view: 'labels' };

const PLACEHOLDER = `{1:F01BANKBEBBAXXX0000000000}{2:I103BANKDEFFXXXXN}{4:
:20:REF12345
:23B:CRED
:32A:260115EUR1234,56
:50K:/BE68539007547034
JOHN DOE
:59:/DE89370400440532013000
JANE ROE
:71A:SHA
-}`;

function labelOf(tag: string, t: Messages): string {
  return t.labels[tag] ?? t.labels[tag.slice(0, 2)] ?? '';
}

function fieldLines(field: MtField, t: Messages): string[] {
  const label = labelOf(field.tag, t);
  const value = field.value.split('\n').map((line) => `  ${line}`);
  const parts = Object.entries(field.parsed ?? {}).map(
    ([key, part]) => `  ${t.parts[key] ?? key}: ${part}`,
  );
  return [`:${field.tag}:${label ? ` ${label}` : ''}`, ...(parts.length > 0 ? parts : value)];
}

function labeled(message: MtMessage, t: Messages): string {
  const blocks = Object.entries(message.blocks).map(([id, value]) => `${t.block(id)}: ${value}`);
  return [
    ...blocks,
    ...(blocks.length > 0 ? [''] : []),
    ...message.fields.flatMap((field) => fieldLines(field, t)),
  ].join('\n');
}

function asJson(message: MtMessage, t: Messages): string {
  const fields = message.fields.map((field) => ({ ...field, label: labelOf(field.tag, t) }));
  return JSON.stringify({ ...message, fields }, null, 2);
}

function render(input: string, view: (typeof views)[number], t: Messages): string {
  const result = parseMt(input);
  if (!result.ok) return '';
  return view === 'labels' ? labeled(result.message, t) : asJson(result.message, t);
}

export default function SwiftMtTool() {
  const t = useMessages(swiftMtMessages);
  const [state, update] = useUrlState(defaults);
  const view = pickOption(state.view, views, 'labels');

  const result = useMemo(() => parseMt(state.input), [state.input]);
  const output = useMemo(() => render(state.input, view, t), [state.input, view, t]);
  const preview = useMemo(() => render(PLACEHOLDER, view, t), [view, t]);

  const onInput = useCallback((input: string) => update({ input }), [update]);
  const onView = useSetter(update, 'view');

  const summary = useMemo(() => {
    if (!result.ok) return '';
    const { type, direction } = result.message;
    const name = type ? t.type(type) : t.unknownType;
    return direction ? `${name} · ${t.directions[direction]}` : name;
  }, [result, t]);

  return (
    <ToolLayout
      options={
        <ChoiceToggle
          label={t.view}
          value={view}
          options={views}
          labels={t.views}
          onChange={onView}
        />
      }
      input={
        <InputPanel
          label={t.input}
          placeholder={PLACEHOLDER}
          value={state.input}
          onChange={onInput}
        />
      }
      output={
        <OutputPanel
          value={output}
          placeholder={preview}
          error={!result.ok && result.error === 'noFields' ? t.errors.noFields : null}
          actions={
            summary !== '' && (
              <Typography variant="body2" color="text.secondary">
                {summary}
              </Typography>
            )
          }
        />
      }
    />
  );
}
