import type { ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { CodeField } from './CodeField';
import { CopyButton } from './CopyButton';

interface OutputPanelProps {
  value: string;
  label?: string;
  error?: string | null;
  actions?: ReactNode;
}

export function OutputPanel({ value, label = 'Output', error, actions }: OutputPanelProps) {
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
