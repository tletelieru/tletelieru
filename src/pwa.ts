import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

async function cacheCurrentPage() {
  await navigator.serviceWorker.ready;
  const assets = performance
    .getEntriesByType('resource')
    .map(({ name }) => name)
    .filter((url) => /\/_astro\/.+\.(?:js|css)$/.test(url));
  const [pages, assetCache] = await Promise.all([caches.open('pages'), caches.open('assets')]);
  await Promise.allSettled([pages.add(location.href), ...assets.map((url) => assetCache.add(url))]);
}

if ('serviceWorker' in navigator && 'caches' in window && !navigator.serviceWorker.controller) {
  void cacheCurrentPage();
}
