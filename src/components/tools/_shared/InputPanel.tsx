import { useCallback, useState, type ChangeEvent, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { CodeField } from './CodeField';
import { sharedMessages } from './messages';
import { PasteButton } from './PasteButton';

interface InputPanelProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  actions?: ReactNode;
  minRows?: number;
}

export function InputPanel({
  value,
  onChange,
  label: labelProp,
  placeholder,
  actions,
  minRows,
}: InputPanelProps) {
  const t = useMessages(sharedMessages);
  const label = labelProp ?? t.input;
  const [denied, setDenied] = useState(false);

  const onFieldChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
    [onChange],
  );

  const onPaste = useCallback(
    (text: string) => {
      setDenied(false);
      onChange(text);
    },
    [onChange],
  );

  const onDenied = useCallback(() => setDenied(true), []);

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          {label}
        </Typography>
        {actions}
        <PasteButton onPaste={onPaste} onDenied={onDenied} />
      </Stack>
      {denied ? <Alert severity="info">{t.pasteDenied}</Alert> : null}
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
