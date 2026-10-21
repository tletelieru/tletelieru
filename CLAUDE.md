# tletelieru — project brief

Source spec: Notion page "🐙 tletelieru (GitHub main repo)"
(https://app.notion.com/p/3fe222f5472b81fc92a5dc5983a742ed). This file distills it so work can start
from the repo. Status: **scaffolded (M0)** — Starlight + React/MUI islands, PWA, CI, first tool (RUT).

## Purpose

Personal site + fully client-side dev toolbox. Static site on GitHub Pages, installable as a PWA.
Every tool runs 100% in the browser — no backend, nothing sent anywhere.

## Stack

- **Astro** (static output) — about me / projects as `.astro` + markdown, zero JS where possible.
- **React islands** for each tool (`client:load`, rendered into the build HTML and hydrated).
- **TypeScript** (strict).
- **MUI** inside the React islands.
- **PWA**: `@vite-pwa/astro` (installable + offline).
- **Lint & format**: ESLint (flat config + `eslint-plugin-astro`, `eslint-plugin-react`) + Prettier
  (`prettier-plugin-astro`).
- **Git hooks**: Husky + lint-staged (lint + format on commit).
- **Tests**: Vitest + React Testing Library.
- **CI**: GitHub Actions — lint, `astro check`, tests before deploy.
- **Deploy**: `withastro/action` → GitHub Pages. Repo is not `tletelieru.github.io`, so set `site`
  and `base: '/tletelieru'` in `astro.config.mjs`.
- The repo's `README.md` doubles as the GitHub profile README.

## Structure

Built on **Astro Starlight** (sidebar, TOC, dark mode; Pagefind is disabled and Starlight's
`Search` is replaced by our command palette on `Ctrl/⌘ + K`) with
**i18n**: English and Spanish under `/tletelieru/en/` and `/tletelieru/es/` (Starlight language
picker in the navbar). `/tletelieru/` (`src/pages/index.astro`) redirects to the saved or browser
language.

```txt
src/
  i18n/locales.ts                        # Locale, Localized<T>, toLocale, pickLocale (no React)
  i18n/react.tsx                         # LocaleProvider, useLocale, useMessages, defineMessages
  content/docs/<locale>/index.mdx        # home: about me, projects, stack, contact (sidebar visible)
  content/docs/<locale>/tools/index.mdx  # /tools index (ToolIndex, grouped by category)
  content/docs/<locale>/tools/<category>/<slug>.mdx  # one page per tool and locale
  content/projects/*.md                  # projects collection (description: { en, es })
  components/ToolEmbed.astro             # preloads the tool module, mounts ToolIsland client:load + keywords
  components/starlight/Head.astro        # Head override: PWA manifest + SW, saves preferred locale,
                                         # restores collapsed sidebar before paint
  components/starlight/Sidebar.astro     # Sidebar override: collapse toggle + favorites/recent island
  components/starlight/Search.astro      # Search override: CommandPalette (fuzzy + smart paste)
  components/module-cache.ts             # createModuleCache: preload + render via use() (no Suspense)
  components/hydration.test.tsx          # prerender + hydrateRoot every tool/feature, no mismatches
  components/tools/ToolIsland.tsx        # single island entry; renders the tool by slug
  components/tools/components.ts         # toolLoaders (slug → import) + toolModules cache
  components/tools/_shared/              # ToolRoot (MUI theme), ToolContext (slug + input/output
                                         # handles), ToolFrame (favorite, shortcuts, hint),
                                         # InputPanel (paste + history), OutputPanel (copy + snippet)
  components/tools/<slug>/<Name>Tool.tsx # tool UI (+ .test.tsx)
  components/FeatureEmbed.astro          # mounts non-tool features (pipeline, snippets, smart-paste)
  components/features/features.ts        # featureLoaders + featureModules cache
  components/{palette,smart-paste,pipeline,snippets,history,favorites,shortcuts}/  # M2 site features
  lib/tools/<slug>.ts                    # pure functions (+ .test.ts)
  lib/tools/_shared/                     # shared helpers (lines, clamp, …)
  lib/tools/registry.ts                  # categories + tool metadata (no React; imported by config)
  lib/url-state.ts                       # useUrlState: state ↔ URL params (sync: false for secrets)
  lib/hydration.ts                       # useHydrated (useSyncExternalStore), useIsMac
  lib/mui/theme.ts                       # toolTheme: CSS variables keyed on Starlight's data-theme
  lib/handoff.ts                         # large prefilled inputs travel via sessionStorage, not URL
  lib/storage.ts                         # createLocalStore/useLocalStore (useSyncExternalStore)
  lib/user-data/                         # favorites, recent, history, snippets stores + reducers
  lib/{search,detect,pipeline,snippets,history,shortcuts}  # pure logic for the M2 features
eslint-rules/index.js                    # local ESLint rules (prefer-logical-and, no-leaked-length)
```

## Conventions

- Adding a tool = pure function + tests in `src/lib/tools/`, island in
  `src/components/tools/<slug>/` with its `messages.ts`, entry in `registry.ts` (`name` and
  `description` as `{ en, es }`), entry in `components.ts`, and one MDX page per locale at
  `src/content/docs/{en,es}/tools/<category>/<slug>.mdx`. `registry.test.ts` fails if any piece is
  missing. The sidebar group for a category appears automatically once it has a tool.
- i18n: every UI string lives in `messages.ts` via `defineMessages({ en, es })` (functions for
  interpolated text) and is read with `useMessages`. Pure functions return codes/data, never prose;
  locale-aware formatting takes a `locale` argument. Tests without a provider run in English; add a
  `<LocaleProvider locale="es">` test per island. Spanish copy uses neutral tuteo, never voseo.
- Tool UI: input box → output box + copy button. State in URL params via `useUrlState`; tools that
  handle secrets (JWT, keys, HMAC) must use `{ sync: false }`.
- Markdown/MDX links and hero links are not base-prefixed by Starlight: write `/tletelieru/...` or
  use `withBase(import.meta.env.BASE_URL, path)`.
- Wrap MUI in `ToolRoot` (adds `.not-content` so Starlight prose styles don't leak in).
- Tools render at build time with their defaults. Anything that reads the browser (URL params,
  `Date.now`, random values, `navigator`, storage) must wait for `useHydrated()` so the first
  client render matches the HTML; `useUrlState` already does this. Don't add `Suspense` or
  `React.lazy` around tools: `hydration.test.tsx` fails on mismatches or outlined boundaries.
- Use `InputPanel` / `OutputPanel` for the main input and output: they give every tool Paste,
  per-tool history, Save snippet and the keyboard shortcuts (they register themselves in
  `ToolContext`). Pass `history={false}` / `snippet={false}` for secrets.
- User data lives only in localStorage through `createLocalStore`; read it with `useLocalStore`.
- Conditional JSX: `cond && <X />`, never `cond ? <X /> : null` (`local/prefer-logical-and`, with
  autofix); compare lengths explicitly (`list.length > 0 &&`, `local/no-leaked-length`). Ternaries
  with null are still fine for non-JSX props such as `error={failed ? message : null}`.

## Tooling notes

- Peer ranges lag behind: `overrides` in `package.json` relax `@vite-pwa/astro` (astro) and
  `eslint-plugin-react` (eslint). Don't switch to `legacy-peer-deps` (it drops required peers).
- `eslint-plugin-react` needs an explicit `settings.react.version` under ESLint 10 (`detect` crashes).
- TypeScript stays on 6.x: `astro check` and typescript-eslint don't support TS 7 yet.
- `astro.config.mjs` builds the sidebar from `registry.ts`; the dev server does not reload the
  config when the registry changes, so restart `astro dev` after adding a category or tool.
- `.husky/pre-push` delegates to the global `core.hooksPath` pre-push (branch-name guard), with an
  env guard to avoid the global hook's chain looping back.

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
- Avoid `useEffect`. Derive values during render or with `useMemo`, wrap handlers in `useCallback`,
  keep timers and mutable values in `useRef`, and run side effects inside event handlers. External
  stores go through `useSyncExternalStore`. `useEffect` only for syncing with an external system
  that no event can drive.
