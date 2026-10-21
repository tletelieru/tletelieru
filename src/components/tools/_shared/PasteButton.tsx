import { useCallback } from 'react';
import Button from '@mui/material/Button';
import { useMessages } from '~/i18n/react';
import { sharedMessages } from './messages';

interface PasteButtonProps {
  onPaste: (text: string) => void;
  onDenied?: () => void;
}

export function PasteButton({ onPaste, onDenied }: PasteButtonProps) {
  const t = useMessages(sharedMessages);

  const paste = useCallback(async () => {
    try {
      onPaste(await navigator.clipboard.readText());
    } catch {
      onDenied?.();
    }
  }, [onPaste, onDenied]);

  return (
    <Button variant="outlined" size="small" onClick={paste}>
      {t.paste}
    </Button>
  );
}
