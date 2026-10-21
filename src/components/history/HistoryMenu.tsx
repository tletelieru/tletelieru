import { useCallback, useId, useState, type MouseEvent } from 'react';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useLocale, useMessages } from '~/i18n/react';
import { formatRelativeTime, truncatePreview } from '~/lib/history/format';
import { useLocalStore } from '~/lib/storage';
import { clearHistory, historyStore, type HistoryEntry } from '~/lib/user-data/history';
import { historyMessages } from './messages';

export interface HistoryMenuProps {
  slug: string;
  onSelect: (value: string) => void;
}

const noEntries: HistoryEntry[] = [];

export function HistoryMenu({ slug, onSelect }: HistoryMenuProps) {
  const t = useMessages(historyMessages);
  const locale = useLocale();
  const menuId = useId();
  const entries = useLocalStore(historyStore)[slug] ?? noEntries;
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [now, setNow] = useState(0);

  const open = useCallback((event: MouseEvent<HTMLElement>) => {
    setNow(Date.now());
    setAnchor(event.currentTarget);
  }, []);
  const close = useCallback(() => setAnchor(null), []);

  const select = useCallback(
    (value: string) => {
      setAnchor(null);
      onSelect(value);
    },
    [onSelect],
  );

  const clear = useCallback(() => {
    setAnchor(null);
    clearHistory(slug);
  }, [slug]);

  if (entries.length === 0) return null;

  return (
    <>
      <Badge badgeContent={entries.length} color="primary" max={99}>
        <Button
          variant="outlined"
          size="small"
          aria-label={t.historyCount(entries.length)}
          aria-haspopup="menu"
          aria-controls={anchor ? menuId : undefined}
          aria-expanded={anchor ? true : undefined}
          onClick={open}
        >
          {t.history}
        </Button>
      </Badge>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={anchor !== null}
        onClose={close}
        slotProps={{ paper: { sx: { maxWidth: 420 } } }}
      >
        {entries.map((entry) => (
          <MenuItem key={`${entry.at}-${entry.value}`} onClick={() => select(entry.value)}>
            <ListItemText
              primary={truncatePreview(entry.value)}
              secondary={formatRelativeTime(entry.at, now, locale)}
              slotProps={{
                primary: {
                  noWrap: true,
                  sx: { fontFamily: 'var(--sl-font-mono, ui-monospace, monospace)', fontSize: 13 },
                },
              }}
            />
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={clear} sx={{ color: 'error.main' }}>
          {t.clear}
        </MenuItem>
      </Menu>
    </>
  );
}
