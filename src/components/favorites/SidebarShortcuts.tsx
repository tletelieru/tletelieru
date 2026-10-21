import Box from '@mui/material/Box';
import { toLocale } from '~/i18n/locales';
import { LocaleProvider, useLocale, useMessages } from '~/i18n/react';
import { useLocalStore } from '~/lib/storage';
import { favoritesStore } from '~/lib/user-data/favorites';
import { clearRecent, recentStore } from '~/lib/user-data/recent';
import { ToolRoot } from '../tools/_shared/ToolRoot';
import { favoriteMessages } from './messages';
import { isCurrentPath, resolveLinks, type ShortcutLink } from './resolve';

const sectionSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
  '& + &': { marginTop: '0.75rem' },
} as const;

const headingSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  margin: 0,
  padding: '0.2em var(--sl-sidebar-item-padding-inline, 0.5rem)',
  fontSize: 'var(--sl-text-sm)',
  fontWeight: 600,
  lineHeight: 1.4,
  color: 'var(--sl-color-white)',
} as const;

const listSx = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  '& a': {
    display: 'block',
    padding: '0.3em var(--sl-sidebar-item-padding-inline, 0.5rem)',
    borderRadius: '0.25rem',
    fontSize: 'var(--sl-text-sm)',
    lineHeight: 1.4,
    color: 'var(--sl-color-gray-2)',
    textDecoration: 'none',
    overflowWrap: 'anywhere',
  },
  '& a:hover, & a:focus-visible': { color: 'var(--sl-color-white)' },
  '& a[aria-current="page"]': {
    color: 'var(--sl-color-text-invert)',
    backgroundColor: 'var(--sl-color-text-accent)',
    fontWeight: 600,
  },
} as const;

const clearSx = {
  padding: '0 0.25rem',
  border: 0,
  background: 'none',
  cursor: 'pointer',
  font: 'inherit',
  fontSize: 'var(--sl-text-xs)',
  fontWeight: 400,
  color: 'var(--sl-color-gray-3)',
  '&:hover, &:focus-visible': { color: 'var(--sl-color-white)' },
} as const;

function LinkList({ links, pathname }: { links: ShortcutLink[]; pathname: string }) {
  return (
    <Box component="ul" sx={listSx}>
      {links.map((link) => (
        <li key={link.slug}>
          <a
            href={link.href}
            aria-current={isCurrentPath(link.href, pathname) ? 'page' : undefined}
          >
            {link.name}
          </a>
        </li>
      ))}
    </Box>
  );
}

function Shortcuts() {
  const locale = useLocale();
  const t = useMessages(favoriteMessages);
  const favoriteSlugs = useLocalStore(favoritesStore);
  const recentEntries = useLocalStore(recentStore);
  const base = import.meta.env.BASE_URL;
  const favorites = resolveLinks(favoriteSlugs, locale, base);
  const recent = resolveLinks(
    recentEntries.map((entry) => entry.slug),
    locale,
    base,
  );
  if (favorites.length === 0 && recent.length === 0) return null;
  const pathname = typeof window === 'undefined' ? '' : window.location.pathname;

  return (
    <Box component="nav" aria-label={t.shortcuts} sx={{ marginBottom: '1rem' }}>
      {favorites.length > 0 && (
        <Box component="section" sx={sectionSx}>
          <Box component="h2" sx={headingSx}>
            {t.favorites}
          </Box>
          <LinkList links={favorites} pathname={pathname} />
        </Box>
      )}
      {recent.length > 0 && (
        <Box component="section" sx={sectionSx}>
          <Box component="h2" sx={headingSx}>
            {t.recent}
            <Box
              component="button"
              type="button"
              aria-label={t.clearRecent}
              title={t.clearRecent}
              onClick={clearRecent}
              sx={clearSx}
            >
              {t.clear}
            </Box>
          </Box>
          <LinkList links={recent} pathname={pathname} />
        </Box>
      )}
    </Box>
  );
}

export default function SidebarShortcuts({ locale }: { locale?: string }) {
  return (
    <LocaleProvider locale={toLocale(locale)}>
      <ToolRoot>
        <Shortcuts />
      </ToolRoot>
    </LocaleProvider>
  );
}
