export function mountSidebarShortcuts(container, config) {
  const escapeHtml = (text) =>
    String(text).replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
    );

  const normalizePath = (path) => String(path).split(/[?#]/)[0].replace(/\/+$/, '');

  const readList = (key) => {
    try {
      const value = JSON.parse(window.localStorage.getItem(key) || 'null');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const resolve = (slugs) => {
    const seen = new Set();
    const links = [];
    for (const slug of slugs) {
      if (links.length >= config.limit) break;
      if (typeof slug !== 'string' || seen.has(slug) || !config.index[slug]) continue;
      seen.add(slug);
      links.push(config.index[slug]);
    }
    return links;
  };

  const list = (links) => {
    const current = normalizePath(window.location.pathname);
    const items = links.map((link) => {
      const active = normalizePath(link.href) === current ? ' aria-current="page"' : '';
      return `<li><a href="${escapeHtml(link.href)}"${active}>${escapeHtml(link.name)}</a></li>`;
    });
    return `<ul>${items.join('')}</ul>`;
  };

  const render = () => {
    const favorites = resolve(readList(config.favoritesKey));
    const recent = resolve(readList(config.recentKey).map((entry) => entry && entry.slug));
    const sections = [];
    if (favorites.length > 0) {
      sections.push(
        `<section><h2>${escapeHtml(config.labels.favorites)}</h2>${list(favorites)}</section>`,
      );
    }
    if (recent.length > 0) {
      const clear = `<button type="button" data-clear-recent aria-label="${escapeHtml(config.labels.clearRecent)}" title="${escapeHtml(config.labels.clearRecent)}">${escapeHtml(config.labels.clear)}</button>`;
      sections.push(
        `<section><h2>${escapeHtml(config.labels.recent)}${clear}</h2>${list(recent)}</section>`,
      );
    }
    container.innerHTML = sections.join('');
    container.hidden = sections.length === 0;
  };

  container.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || !target.closest('[data-clear-recent]')) return;
    try {
      window.localStorage.setItem(config.recentKey, '[]');
    } catch {
      return;
    }
    render();
  });

  const onStoreChange = (event) => {
    const key = event.type === 'storage' ? event.key : event.detail;
    if (key === null || key === config.favoritesKey || key === config.recentKey) render();
  };
  window.addEventListener(config.event, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  render();
}
