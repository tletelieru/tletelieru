export function mountFavoriteStars(root, config) {
  const STAR =
    '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.8l2.84 5.75 6.35.92-4.6 4.48 1.09 6.32L12 17.29l-5.68 2.98 1.09-6.32-4.6-4.48 6.35-.92L12 2.8z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';

  const normalizePath = (path) => String(path).split(/[?#]/)[0].replace(/\/+$/, '');

  const readFavorites = () => {
    try {
      const value = JSON.parse(window.localStorage.getItem(config.key) || '[]');
      return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
    } catch {
      return [];
    }
  };

  const writeFavorites = (list) => {
    try {
      window.localStorage.setItem(config.key, JSON.stringify(list));
    } catch {
      return;
    }
    window.dispatchEvent(new CustomEvent(config.event, { detail: config.key }));
  };

  const sync = (button, favorites) => {
    const active = favorites.includes(button.dataset.favoriteStar);
    const label = active ? config.labels.remove : config.labels.add;
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', label);
    button.title = label;
  };

  const syncAll = () => {
    const favorites = readFavorites();
    for (const button of document.querySelectorAll('[data-favorite-star]')) sync(button, favorites);
  };

  const slugByPath = new Map(
    Object.entries(config.paths || {}).map(([slug, href]) => [normalizePath(href), slug]),
  );

  const decorate = () => {
    const favorites = readFavorites();
    for (const link of root.querySelectorAll('a[href]')) {
      const slug = slugByPath.get(normalizePath(link.getAttribute('href')));
      const parent = link.parentElement;
      if (!slug || !parent || parent.querySelector(':scope > [data-favorite-star]')) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'favorite-star';
      button.dataset.favoriteStar = slug;
      button.innerHTML = STAR;
      parent.classList.add('has-favorite-star');
      link.after(button);
      sync(button, favorites);
    }
    for (const button of root.querySelectorAll('[data-favorite-star]')) sync(button, favorites);
  };

  if (!window.__tlFavoriteStars) {
    window.__tlFavoriteStars = true;
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target && target.closest('[data-favorite-star]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      const slug = button.dataset.favoriteStar;
      const favorites = readFavorites();
      writeFavorites(
        favorites.includes(slug) ? favorites.filter((item) => item !== slug) : [...favorites, slug],
      );
      syncAll();
    });
    const onStoreChange = (event) => {
      const key = event.type === 'storage' ? event.key : event.detail;
      if (key === null || key === config.key) syncAll();
    };
    window.addEventListener(config.event, onStoreChange);
    window.addEventListener('storage', onStoreChange);
  }

  decorate();
  if (config.observe)
    new MutationObserver(decorate).observe(root, { childList: true, subtree: true });
}
