import {
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { trackToolEvent } from '~/lib/analytics';
import { addHistory } from '~/lib/user-data/history';
import { HistoryMenu } from '../../history/HistoryMenu';
import { CodeField } from './CodeField';
import { sharedMessages } from './messages';
import { PasteButton } from './PasteButton';
import { useToolContext } from './ToolContext';

export const HISTORY_DELAY_MS = 1500;

interface InputPanelProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  actions?: ReactNode;
  minRows?: number;
  history?: boolean;
}

export function InputPanel({
  value,
  onChange,
  label: labelProp,
  placeholder,
  actions,
  minRows,
  history = true,
}: InputPanelProps) {
  const t = useMessages(sharedMessages);
  const label = labelProp ?? t.input;
  const { slug, inputRef } = useToolContext();
  const [denied, setDenied] = useState(false);
  const historyTimer = useRef<number | undefined>(undefined);
  const recordsHistory = history && slug !== null;

  useImperativeHandle(inputRef, () => ({ value, set: onChange }), [value, onChange]);

  const record = useCallback(
    (next: string, delay: number) => {
      if (!recordsHistory || slug === null) return;
      window.clearTimeout(historyTimer.current);
      historyTimer.current = window.setTimeout(() => addHistory(slug, next), delay);
    },
    [recordsHistory, slug],
  );

  const onFieldChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(event.target.value);
      record(event.target.value, HISTORY_DELAY_MS);
      trackToolEvent('used', slug);
    },
    [onChange, record, slug],
  );

  const onPaste = useCallback(
    (text: string) => {
      setDenied(false);
      onChange(text);
      record(text, 0);
      trackToolEvent('used', slug);
    },
    [onChange, record, slug],
  );

  const onDenied = useCallback(() => setDenied(true), []);

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          {label}
        </Typography>
        {actions}
        {recordsHistory && slug !== null && <HistoryMenu slug={slug} onSelect={onChange} />}
        <PasteButton onPaste={onPaste} onDenied={onDenied} />
      </Stack>
      {denied && <Alert severity="info">{t.pasteDenied}</Alert>}
      <CodeField
        value={value}
        placeholder={placeholder}
        minRows={minRows}
        onChange={onFieldChange}
        slotProps={{ htmlInput: { 'aria-label': label } }}
      />
    </Stack>
  );
}
