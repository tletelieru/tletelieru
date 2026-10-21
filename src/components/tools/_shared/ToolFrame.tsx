import type { ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import { FavoriteButton } from '../../favorites/FavoriteButton';
import { ShortcutNotice } from '../../shortcuts/ShortcutNotice';
import { ShortcutsHint } from '../../shortcuts/ShortcutsHint';
import { useToolShortcuts } from '../../shortcuts/useToolShortcuts';
import { useToolSlug } from './ToolContext';

export function ToolFrame({ children }: { children: ReactNode }) {
  const slug = useToolSlug();
  const { onKeyDown, notice, dismiss } = useToolShortcuts();
  return (
    <Stack spacing={1.5} onKeyDown={onKeyDown}>
      {slug && (
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <FavoriteButton slug={slug} />
        </Stack>
      )}
      {children}
      <ShortcutsHint />
      <ShortcutNotice notice={notice} onClose={dismiss} />
    </Stack>
  );
}
