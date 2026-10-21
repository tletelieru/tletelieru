# Development

Personal site and client-side dev toolbox built with **Astro Starlight + React islands (MUI)**,
static on GitHub Pages and installable as a PWA. Every tool runs 100% in the browser.

```sh
npm install
npm run dev        # http://localhost:4321/tletelieru/
npm test           # Vitest
npm run lint       # ESLint (incl. local rules in eslint-rules/)
npm run check      # astro check
npm run build      # static build + PWA service worker
```

Architecture, conventions and the tool checklist live in [`CLAUDE.md`](./CLAUDE.md).

## Workflow

- Branch from `dev` with a conventional prefix (`feat/`, `fix/`, `docs/`, …) and open a PR to
  `dev`; `dev` is released to `main` through a PR.
- CI runs lint, format check, `astro check` and tests on every PR; pushes to `main` deploy to
  GitHub Pages.
