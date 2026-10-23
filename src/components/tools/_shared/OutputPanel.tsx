import { useImperativeHandle, type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useLocale, useMessages } from '~/i18n/react';
import { getTool } from '~/lib/tools/registry';
import { SaveSnippetButton } from '../../snippets/SaveSnippetButton';
import { CodeField } from './CodeField';
import { CopyButton } from './CopyButton';
import { sharedMessages } from './messages';
import { useToolContext } from './ToolContext';

interface OutputPanelProps {
  value: string;
  label?: string;
  error?: string | null;
  placeholder?: string;
  actions?: ReactNode;
  snippet?: boolean;
}

export function OutputPanel({
  value,
  label: labelProp,
  error,
  placeholder,
  actions,
  snippet = true,
}: OutputPanelProps) {
  const t = useMessages(sharedMessages);
  const label = labelProp ?? t.output;
  const locale = useLocale();
  const { slug, outputRef } = useToolContext();
  const toolName = slug ? getTool(slug)?.name[locale] : undefined;

  useImperativeHandle(outputRef, () => ({ value }), [value]);

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          {label}
        </Typography>
        {actions}
        {snippet && <SaveSnippetButton content={value} defaultTitle={toolName} />}
        <CopyButton text={value} />
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <CodeField
        value={value}
        placeholder={placeholder}
        slotProps={{ htmlInput: { readOnly: true, 'aria-label': label } }}
      />
    </Stack>
  );
}
