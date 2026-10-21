import {
  Fragment,
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { toLocale, type Locale } from '~/i18n/locales';
import { LocaleProvider, useLocale, useMessages } from '~/i18n/react';
import { detectInput } from '~/lib/detect';
import { followToolLink } from '~/lib/handoff';
import {
  buildPaletteSections,
  flattenSections,
  moveSelection,
  truncate,
  type PaletteItem,
} from '~/lib/search/palette';
import { useLocalStore } from '~/lib/storage';
import { getCategory } from '~/lib/tools/registry';
import { favoritesStore } from '~/lib/user-data/favorites';
import { recentStore } from '~/lib/user-data/recent';
import { snippetsStore } from '~/lib/user-data/snippets';
import { ToolRoot } from '../tools/_shared/ToolRoot';
import { paletteMessages } from './messages';
import { closePalette, openPalette, usePaletteOpen } from './paletteStore';

type PaletteMessages = (typeof paletteMessages)['en'];

const PREVIEW_LENGTH = 80;
const LISTBOX_ID = 'command-palette-results';

function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <Box
      component="kbd"
      sx={{
        ml: 1,
        px: 0.75,
        py: 0.125,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        fontSize: '0.75rem',
        fontFamily: 'inherit',
        lineHeight: 1.4,
        color: 'text.secondary',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Box>
  );
}

function itemText(
  item: PaletteItem,
  locale: Locale,
  t: PaletteMessages,
  copiedId: string | null,
): { primary: string; secondary: string } {
  switch (item.kind) {
    case 'detection':
      return {
        primary: t.openIn(item.tool.name[locale]),
        secondary: truncate(item.detection.params.input ?? '', PREVIEW_LENGTH),
      };
    case 'tool':
      return {
        primary: item.favorite ? `${item.tool.name[locale]} ★` : item.tool.name[locale],
        secondary: getCategory(item.tool.category).label[locale],
      };
    case 'snippet':
      return {
        primary: item.snippet.title,
        secondary:
          copiedId === item.id
            ? t.copied
            : [t.copySnippet, ...item.snippet.tags.map((tag) => `#${tag}`)].join(' · '),
      };
    case 'all':
      return { primary: t.allTools, secondary: '' };
  }
}

function scrollIntoViewRef(element: HTMLElement | null) {
  element?.scrollIntoView?.({ block: 'nearest' });
}

function Palette() {
  const t = useMessages(paletteMessages);
  const locale = useLocale();
  const open = usePaletteOpen();
  const favorites = useLocalStore(favoritesStore);
  const recent = useLocalStore(recentStore);
  const snippets = useLocalStore(snippetsStore);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const deferredQuery = useDeferredValue(query);
  const isMac = isMacPlatform();
  const shortcut = isMac ? '⌘K' : 'Ctrl K';

  const detections = useMemo(() => detectInput(deferredQuery), [deferredQuery]);
  const sections = useMemo(
    () =>
      buildPaletteSections({
        query: deferredQuery,
        locale,
        base: import.meta.env.BASE_URL,
        favorites,
        recent,
        snippets,
        detections,
      }),
    [deferredQuery, locale, favorites, recent, snippets, detections],
  );
  const items = useMemo(() => flattenSections(sections), [sections]);
  const active = Math.min(selected, Math.max(items.length - 1, 0));
  const hasMatches = items.some((item) => item.kind !== 'all');

  const onClose = useCallback(() => {
    closePalette();
    setQuery('');
    setSelected(0);
    setCopiedId(null);
  }, []);

  const activate = useCallback(
    async (item: PaletteItem | undefined) => {
      if (!item) return;
      if (item.kind === 'snippet') {
        try {
          await navigator.clipboard.writeText(item.snippet.content);
        } catch {
          return;
        }
        setCopiedId(item.id);
        window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setCopiedId(null), 1500);
        return;
      }
      onClose();
      followToolLink(item.link);
    },
    [onClose],
  );

  const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setSelected(0);
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setSelected(moveSelection(active, event.key === 'ArrowDown' ? 1 : -1, items.length));
      } else if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
        event.preventDefault();
        void activate(items[active]);
      }
    },
    [activate, active, items],
  );

  let index = -1;

  return (
    <>
      <Button
        variant="outlined"
        color="inherit"
        size="small"
        onClick={openPalette}
        aria-label={t.openSearch}
        aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
        startIcon={<SearchIcon />}
        sx={{
          textTransform: 'none',
          borderColor: 'divider',
          color: 'text.secondary',
          minWidth: 0,
          '& .MuiButton-startIcon': { mr: { xs: 0, md: 1 } },
        }}
      >
        <Box component="span" sx={{ display: { xs: 'none', md: 'inline' }, pr: 2 }}>
          {t.search}
        </Box>
        <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
          <Kbd>{shortcut}</Kbd>
        </Box>
      </Button>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        aria-label={t.dialogTitle}
        sx={{ '& .MuiDialog-container': { alignItems: 'flex-start' } }}
        slotProps={{ paper: { sx: { mt: { xs: 2, sm: 10 } } } }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <TextField
            autoFocus
            fullWidth
            value={query}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder={t.placeholder}
            slotProps={{
              htmlInput: {
                'aria-label': t.search,
                role: 'combobox',
                'aria-expanded': true,
                'aria-controls': LISTBOX_ID,
                'aria-activedescendant': items[active] ? `palette-${items[active].id}` : undefined,
                autoComplete: 'off',
                spellCheck: false,
              },
            }}
          />
        </Box>
        <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {query.trim() !== '' && !hasMatches && (
            <Typography sx={{ px: 3, py: 2 }} color="text.secondary">
              {t.noResults}
            </Typography>
          )}
          <List id={LISTBOX_ID} role="listbox" aria-label={t.results} dense disablePadding>
            {sections.map((section) => (
              <Fragment key={section.id}>
                <ListSubheader disableSticky sx={{ lineHeight: '2rem', bgcolor: 'transparent' }}>
                  {t.sections[section.id]}
                </ListSubheader>
                {section.items.map((item) => {
                  index++;
                  const position = index;
                  const isActive = position === active;
                  const text = itemText(item, locale, t, copiedId);
                  return (
                    <ListItemButton
                      key={item.id}
                      id={`palette-${item.id}`}
                      role="option"
                      aria-selected={isActive}
                      selected={isActive}
                      ref={isActive ? scrollIntoViewRef : undefined}
                      onMouseMove={() => setSelected(position)}
                      onClick={() => void activate(item)}
                    >
                      <ListItemText
                        primary={text.primary}
                        secondary={text.secondary || undefined}
                        slotProps={{
                          secondary: { noWrap: true },
                        }}
                      />
                    </ListItemButton>
                  );
                })}
              </Fragment>
            ))}
          </List>
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider' }}
        >
          {t.hints}
        </Typography>
      </Dialog>
    </>
  );
}

export default function CommandPalette({ locale }: { locale?: string }) {
  return (
    <LocaleProvider locale={toLocale(locale)}>
      <ToolRoot>
        <Palette />
      </ToolRoot>
    </LocaleProvider>
  );
}
