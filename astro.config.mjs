import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import AstroPWA from '@vite-pwa/astro';
import { categoriesWithTools } from './src/lib/tools/registry.ts';

const base = '/tletelieru';

export default defineConfig({
  site: 'https://tletelieru.github.io',
  base,
  integrations: [
    starlight({
      title: 'tletelieru',
      description: 'Personal site and client-side dev toolbox. Nothing leaves your browser.',
      defaultLocale: 'en',
      locales: {
        en: { label: 'English', lang: 'en' },
        es: { label: 'Español', lang: 'es' },
      },
      logo: { src: './src/assets/logo.svg', replacesTitle: false },
      favicon: '/favicon.svg',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/tletelieru' }],
      lastUpdated: false,
      pagefind: false,
      components: {
        Head: './src/components/starlight/Head.astro',
        LanguageSelect: './src/components/starlight/LanguageSelect.astro',
        ThemeSelect: './src/components/starlight/ThemeSelect.astro',
        Search: './src/components/starlight/Search.astro',
        Sidebar: './src/components/starlight/Sidebar.astro',
        PageTitle: './src/components/starlight/PageTitle.astro',
      },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        { label: 'All tools', translations: { es: 'Todas las herramientas' }, slug: 'tools' },
        { label: 'Pipelines', translations: { es: 'Pipelines' }, slug: 'tools/pipeline' },
        { label: 'Snippets', translations: { es: 'Snippets' }, slug: 'tools/snippets' },
        ...categoriesWithTools().map((category) => ({
          label: category.label.en,
          translations: { es: category.label.es },
          items: [{ autogenerate: { directory: `tools/${category.id}` } }],
        })),
      ],
    }),
    react(),
    AstroPWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'tletelieru — dev toolbox',
        short_name: 'tletelieru',
        description: 'Client-side dev tools: IDs, SQL, time, text, JSON. Works offline.',
        theme_color: '#17181c',
        background_color: '#17181c',
        display: 'standalone',
        start_url: `${base}/`,
        scope: `${base}/`,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: null,
        globPatterns: ['**/*.{html,js,css,svg,png,ico,webp,woff,woff2,txt}'],
      },
    }),
  ],
});
