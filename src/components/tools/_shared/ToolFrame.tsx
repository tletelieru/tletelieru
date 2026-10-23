import type { ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import { ShortcutNotice } from '../../shortcuts/ShortcutNotice';
import { ShortcutsHint } from '../../shortcuts/ShortcutsHint';
import { useToolShortcuts } from '../../shortcuts/useToolShortcuts';

export function ToolFrame({ children }: { children: ReactNode }) {
  const { onKeyDown, notice, dismiss } = useToolShortcuts();
  return (
    <Stack spacing={1.5} onKeyDown={onKeyDown}>
      {children}
      <ShortcutsHint />
      <ShortcutNotice notice={notice} onClose={dismiss} />
    </Stack>
  );
}
