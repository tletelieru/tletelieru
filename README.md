# tletelieru

Personal site + client-side dev toolbox, built with **Astro Starlight + React islands (MUI)**.
Static on GitHub Pages and installable as a PWA. All tools run 100% in the browser — nothing is
sent anywhere.

**Site:** https://tletelieru.github.io/tletelieru/

## Toolbox

IDs & documents (RUT, CPF, CNPJ, national IDs), SQL helpers, time converters, text and JSON tools,
with more on the way. Every tool keeps its state in the URL, so results can be shared as links.

## Development

```sh
npm install
npm run dev        # http://localhost:4321/tletelieru/
npm test           # Vitest
npm run lint       # ESLint
npm run check      # astro check
npm run build      # static build + PWA service worker
```

See [`CLAUDE.md`](./CLAUDE.md) for architecture and conventions.
