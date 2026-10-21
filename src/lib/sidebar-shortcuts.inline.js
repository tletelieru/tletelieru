export function mountSidebarShortcuts(container, config) {
  const escapeHtml = (text) =>
    String(text).replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
    );

  const normalizePath = (path) => String(path).split(/[?#]/)[0].replace(/\/+$/, '');

  const readJson = (key, fallback) => {
    try {
      const value = JSON.parse(window.localStorage.getItem(key) || 'null');
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  };

  const readList = (key) => {
    const value = readJson(key, []);
    return Array.isArray(value) ? value : [];
  };

  const readCollapsed = () => {
    const value = readJson(config.sectionsKey, {});
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
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

  const section = (id, title, links, extra, collapsed) =>
    `<details data-section="${id}"${collapsed[id] === true ? '' : ' open'}><summary><span class="sidebar-shortcuts-title">${escapeHtml(title)}</span>${extra}<span class="sidebar-shortcuts-caret" aria-hidden="true"></span></summary>${list(links)}</details>`;

  const render = () => {
    const collapsed = readCollapsed();
    const favorites = resolve(readList(config.favoritesKey));
    const recent = resolve(readList(config.recentKey).map((entry) => entry && entry.slug));
    const sections = [];
    if (favorites.length > 0) {
      sections.push(section('favorites', config.labels.favorites, favorites, '', collapsed));
    }
    if (recent.length > 0) {
      const clear = `<button type="button" data-clear-recent aria-label="${escapeHtml(config.labels.clearRecent)}" title="${escapeHtml(config.labels.clearRecent)}">${escapeHtml(config.labels.clear)}</button>`;
      sections.push(section('recent', config.labels.recent, recent, clear, collapsed));
    }
    container.innerHTML = sections.join('');
    container.hidden = sections.length === 0;
  };

  container.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || !target.closest('[data-clear-recent]')) return;
    event.preventDefault();
    try {
      window.localStorage.setItem(config.recentKey, '[]');
    } catch {
      return;
    }
    render();
  });

  container.addEventListener(
    'toggle',
    (event) => {
      const details = event.target instanceof HTMLDetailsElement ? event.target : null;
      const id = details && details.dataset.section;
      if (!id) return;
      const collapsed = readCollapsed();
      collapsed[id] = !details.open;
      try {
        window.localStorage.setItem(config.sectionsKey, JSON.stringify(collapsed));
      } catch {
        return;
      }
    },
    true,
  );

  const onStoreChange = (event) => {
    const key = event.type === 'storage' ? event.key : event.detail;
    if (key === null || key === config.favoritesKey || key === config.recentKey) render();
  };
  window.addEventListener(config.event, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  render();
}
