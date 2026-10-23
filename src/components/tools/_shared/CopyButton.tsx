import { useCallback, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import { useMessages } from '~/i18n/react';
import { trackToolEvent } from '~/lib/analytics';
import { sharedMessages } from './messages';
import { useToolSlug } from './ToolContext';

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const t = useMessages(sharedMessages);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  const slug = useToolSlug();

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    trackToolEvent('copied', slug);
    setCopied(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 1500);
  }, [text, slug]);

  return (
    <Button variant="contained" size="small" disabled={!text} onClick={copy}>
      {copied ? t.copied : (label ?? t.copy)}
    </Button>
  );
}
