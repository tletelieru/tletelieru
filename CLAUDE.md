# tletelieru — project brief

Source spec: Notion page "🐙 tletelieru (GitHub main repo)"
(). This file distills it so work can start
from the repo. Status: **bare repo, nothing scaffolded yet.**

## Purpose

Personal site + fully client-side dev toolbox. Static site on GitHub Pages, installable as a PWA.
Every tool runs 100% in the browser — no backend, nothing sent anywhere.

## Stack

- **Astro** (static output) — about me / projects as `.astro` + markdown, zero JS where possible.
- **React islands** for each tool (`client:only="react"`).
- **TypeScript** (strict).
- **MUI** inside the React islands.
- **PWA**: `@vite-pwa/astro` (installable + offline).
- **Lint & format**: ESLint (flat config + `eslint-plugin-astro`, `eslint-plugin-react`) + Prettier
  (`prettier-plugin-astro`).
- **Git hooks**: Husky + lint-staged (lint + format on commit).
- **Tests**: Vitest + React Testing Library.
- **CI**: GitHub Actions — lint, `astro check`, tests before deploy.
- **Deploy**: `withastro/action` → GitHub Pages. Repo is not `tletelieru.github.io`, so set `site`
  + `base: '/tletelieru'` in `astro.config.mjs`.
- The repo's `README.md` doubles as the GitHub profile README.

## Structure

```txt
src/
  pages/
    index.astro          # about me + projects + stack
    tools/
      index.astro        # tool list / search
      [tool].astro       # each tool (getStaticPaths from the registry)
  content/projects/      # one .md per project
  components/tools/      # React island per tool (MUI)
  lib/tools/             # pure functions (formatters, validators, generators) + tests
  lib/tools/registry.ts  # name, slug, category, component
```

## Conventions

- Each tool = a **pure function** in `src/lib/tools/` with unit tests, plus a **React island** in
  `src/components/tools/`.
- Tool UI: input box → output box + copy button. Shareable via URL params (state in the URL).
- `/tools` is docs-style: top search bar (fuzzy by name/category/keywords, `Ctrl/⌘ + K`), tools
  grouped by category with linked titles, left sidebar on every tool page, "On this page" TOC on
  long tools, breadcrumb Tools / Category / Tool. Astro **Starlight** is an option (sidebar,
  Pagefind search, TOC, dark mode out of the box).

## Roadmap

**First batch — tools 1–14:**
1. RUT (Chile) — generate valid / validate / format.
2. CPF (Brazil) — generate / validate / mask.
3. CNPJ (Brazil) — generate / validate / mask (incl. new alphanumeric).
4. DNI / national IDs by country (AR, PE, CO, MX, UY, ES, EC).
5. SQL `IN` from text → `IN ('a', 'b', ...)` (trim, dedupe, skip blanks).
6. SQL `IN` from numbers → `IN (1, 2, 3)`.
7. SQL LIKE chain → `col LIKE '%a%' OR ...` (AND / NOT LIKE / ILIKE options).
8. SQL JSON field query (Postgres jsonb / MySQL JSON).
9. SQL formatter options (quote style, escape `'`→`''`, one-per-line vs single line, batches of N).
10. Timezone converter (default America/Santiago ↔ UTC).
11. Unix converter (s / ms ↔ ISO 8601 ↔ human, "now", auto-detect s vs ms).
12. Case converter (snake ↔ kebab ↔ camel ↔ Pascal ↔ CONSTANT ↔ Title).
13. JSON prettier (format / minify / validate with error line, sort keys).
14. HTML renderer (live preview in a sandboxed iframe).

**Site features (F1–F6):** smart paste (auto-detect input type), pipelines (chain tools),
favorites & recent (localStorage), per-tool local history, dark mode + keyboard shortcuts, snippets.

**Backlog:** large catalog in the Notion page — IDs & encoding, SQL & data, money & ledger, text,
time, fintech/work, HTTP/cURL/auth, JWT suite, files, DevOps. Pull specifics from Notion when
building.

## Build prompt (from Notion, for reference)

> Build an Astro static site (TypeScript strict) with React islands and MUI, PWA via
> `@vite-pwa/astro`, deployed to GitHub Pages with `base: '/tletelieru'`. ESLint (flat config,
> astro + react plugins) + Prettier (astro plugin), Husky + lint-staged, Vitest + React Testing
> Library, GitHub Actions running lint, `astro check` and tests before deploy. Pages: `/` (about me,
> projects from a content collection, stack) and `/tools` (docs-style index: search with
> `Ctrl/⌘+K`, tools grouped by category with linked titles, sidebar on every tool page) with one
> route per tool. Every tool is a pure function in `src/lib/tools/` with unit tests plus a React
> island in `src/components/tools/`, input → output with a copy button, state in URL params, fully
> client-side. Start with tools 1–14.

## Working rules

- No code comments unless explicitly requested.
