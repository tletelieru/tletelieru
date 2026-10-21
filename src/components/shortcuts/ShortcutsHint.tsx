import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { useIsMac } from '~/lib/hydration';
import { formatShortcut, shortcutList } from '~/lib/shortcuts';
import { shortcutMessages } from './messages';

export function ShortcutsHint() {
  const t = useMessages(shortcutMessages);
  const isMac = useIsMac();
  const items = shortcutList.map(
    ({ action }) => `${formatShortcut(action, isMac)} ${t.actions[action]}`,
  );
  return (
    <Typography variant="caption" component="p" color="text.secondary">
      {`${t.label}: ${items.join(' · ')}`}
    </Typography>
  );
}
