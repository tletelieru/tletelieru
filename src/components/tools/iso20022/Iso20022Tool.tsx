import { useCallback, useMemo } from 'react';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { processIso20022, xmlModes } from '~/lib/tools/iso20022';
import { pickOption } from '~/lib/tools/sql/format';
import { useUrlState } from '~/lib/url-state';
import { InputPanel } from '../_shared/InputPanel';
import { ChoiceToggle, useSetter } from '../_shared/options';
import { OutputPanel } from '../_shared/OutputPanel';
import { ToolLayout } from '../_shared/ToolLayout';
import { iso20022Messages } from './messages';

const defaults = { input: '', mode: 'pretty', indent: '2' };
const indents = ['2', '4'] as const;

const PLACEHOLDER =
  '<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09"><CstmrCdtTrfInitn><GrpHdr><MsgId>MSG-0001</MsgId><NbOfTxs>1</NbOfTxs><CtrlSum>1500.00</CtrlSum></GrpHdr></CstmrCdtTrfInitn></Document>';

export default function Iso20022Tool() {
  const t = useMessages(iso20022Messages);
  const [state, update] = useUrlState(defaults);
  const mode = pickOption(state.mode, xmlModes, 'pretty');
  const indent = pickOption(state.indent, indents, '2');
  const active = state.input.trim() !== '';

  const result = useMemo(
    () => (active ? processIso20022(state.input, mode, Number(indent)) : null),
    [active, state.input, mode, indent],
  );
  const preview = useMemo(() => {
    const sample = processIso20022(PLACEHOLDER, mode, Number(indent));
    return sample.ok ? sample.output : undefined;
  }, [mode, indent]);

  const onInput = useCallback((input: string) => update({ input }), [update]);
  const onMode = useSetter(update, 'mode');
  const onIndent = useSetter(update, 'indent');

  const message = result?.ok ? result.message : null;

  return (
    <ToolLayout
      options={
        <>
          <ChoiceToggle
            label={t.mode}
            value={mode}
            options={xmlModes}
            labels={t.modes}
            onChange={onMode}
          />
          {mode === 'pretty' && (
            <ChoiceToggle
              label={t.indent}
              value={indent}
              options={indents}
              labels={t.indents}
              onChange={onIndent}
            />
          )}
        </>
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
          value={result?.ok ? result.output : ''}
          placeholder={preview}
          error={result && !result.ok ? t.error(result.error) : null}
          actions={
            result?.ok && (
              <Typography variant="body2" color="text.secondary">
                {message
                  ? t.message(message.id, t.families[message.family] ?? '')
                  : t.unknownMessage}
              </Typography>
            )
          }
        />
      }
    />
  );
}
