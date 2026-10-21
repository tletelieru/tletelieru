# tletelieru

Personal site + client-side dev toolbox, built with **Astro Starlight + React islands (MUI)**.
Static on GitHub Pages and installable as a PWA. All tools run 100% in the browser — nothing is
sent anywhere.

**Site:** https://tletelieru.github.io/tletelieru/

## Toolbox

Available in English and Spanish. Every tool keeps its state in the URL, so results can be shared
as links (secrets such as JWTs and HMAC keys never are). Press `Ctrl/⌘ + K` to search or paste
anything and the right tool opens with it; chain tools in Pipelines and keep favorites, history
and snippets locally.

- **IDs & documents:** RUT (Chile), CPF and CNPJ (Brazil, incl. alphanumeric CNPJ), national IDs
  for Argentina, Peru, Colombia, Mexico, Uruguay, Spain and Ecuador, UUID v4/v7, ULID and Nano ID
  generator and inspector.
- **Encoding & hashing:** Base64 (text and files), URL encoder and query parser, MD5 / SHA hashes
  and HMAC, HTML entities, JSON string escape.
- **JWT:** decoder with claim dates and warnings.
- **SQL:** `IN` from text or numbers, `LIKE` chains, JSON field queries (Postgres / MySQL), list
  formatter (quotes, escaping, batches, arrays, `VALUES`).
- **Time:** timezone converter (DST-aware), Unix timestamp converter.
- **Text & data:** case converter, JSON formatter / validator with exact error positions.
- **Web:** sandboxed HTML preview.

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
