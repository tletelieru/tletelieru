import Typography from '@mui/material/Typography';
import { useMessages } from '~/i18n/react';
import { formatShortcut, isMacPlatform, shortcutList } from '~/lib/shortcuts';
import { shortcutMessages } from './messages';

function detectMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return isMacPlatform(navigator.platform || navigator.userAgent);
}

export function ShortcutsHint() {
  const t = useMessages(shortcutMessages);
  const isMac = detectMac();
  const items = shortcutList.map(
    ({ action }) => `${formatShortcut(action, isMac)} ${t.actions[action]}`,
  );
  return (
    <Typography variant="caption" component="p" color="text.secondary">
      {`${t.label}: ${items.join(' · ')}`}
    </Typography>
  );
}
