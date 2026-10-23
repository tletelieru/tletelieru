export interface FavoriteStarsConfig {
  key: string;
  event: string;
  labels: { add: string; remove: string };
  paths?: Record<string, string>;
  observe?: boolean;
}

export function mountFavoriteStars(root: Element, config: FavoriteStarsConfig): void;
