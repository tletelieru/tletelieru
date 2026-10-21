import { useCallback } from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useMessages } from '~/i18n/react';
import { useLocalStore } from '~/lib/storage';
import { favoritesStore, toggleFavorite } from '~/lib/user-data/favorites';
import { favoriteMessages } from './messages';

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 2.8l2.84 5.75 6.35.92-4.6 4.48 1.09 6.32L12 17.29l-5.68 2.98 1.09-6.32-4.6-4.48 6.35-.92L12 2.8z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FavoriteButton({ slug }: { slug: string }) {
  const t = useMessages(favoriteMessages);
  const favorites = useLocalStore(favoritesStore);
  const active = favorites.includes(slug);
  const label = active ? t.remove : t.add;
  const toggle = useCallback(() => toggleFavorite(slug), [slug]);

  return (
    <Tooltip title={label}>
      <IconButton
        size="small"
        aria-label={label}
        aria-pressed={active}
        onClick={toggle}
        sx={{ color: active ? 'warning.main' : 'text.secondary' }}
      >
        <StarIcon filled={active} />
      </IconButton>
    </Tooltip>
  );
}
