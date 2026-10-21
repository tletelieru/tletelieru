import type { ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { CodeField } from './CodeField';
import { CopyButton } from './CopyButton';
import { sharedMessages } from './messages';

interface OutputPanelProps {
  value: string;
  label?: string;
  error?: string | null;
  actions?: ReactNode;
}

export function OutputPanel({ value, label: labelProp, error, actions }: OutputPanelProps) {
  const t = useMessages(sharedMessages);
  const label = labelProp ?? t.output;
  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          {label}
        </Typography>
        {actions}
        <CopyButton text={value} />
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <CodeField value={value} slotProps={{ htmlInput: { readOnly: true, 'aria-label': label } }} />
    </Stack>
  );
}
