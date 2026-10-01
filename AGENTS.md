# AGENTS.md

Client-side task manager. React 18 + Vite, no backend, persistence in
`localStorage`. Migrated from a vanilla-JS MVP on the
`feat/react-vite-migration` branch (closed, 10/10 tasks); the legacy
`app.js` is gone — its Store logic now lives in `src/store/store.js`
and its UI in the React components.

## Toolchain

- Node 24, npm. No Bun, no pnpm, no yarn.
- React 18.3.1, Vite 5.4.21, Vitest 2.1.9. Runtime deps: only `react` and
  `react-dom`; everything else is a devDep.
- Scripts in `package.json`:
  - `npm run dev` — Vite dev server on `http://localhost:5173` with HMR.
  - `npm run build` — production bundle into `dist/`. CSS is extracted
    as a separate file (in dev, Vite serves CSS as a JS module wrapper,
    which is normal — don't be surprised by the asymmetry).
  - `npm run preview` — serves the built `dist/` locally.
  - `npm test` — runs Vitest once. `npm run test:watch` runs in watch mode.

## Verify your work

- Run `npm test`. Currently **92/92 passing** (64 unit + 28 acceptance RTL).
  The acceptance suite (`tests/acceptance/app.test.jsx`) covers the 10
  MVP criteria; the unit suite (`tests/unit/store.test.js`) covers the
  Store layer.
- Run `npm run build` after non-trivial UI changes; check that `dist/`
  contains `index.html` plus `assets/index-*.{js,css}`.
- Manual smoke: `npm run dev`, then create / toggle / edit / delete a
  task, switch filters with mouse and keyboard (ArrowLeft/Right,
  Home/End), confirm the live region announces actions.

## E2E (Playwright)

Real-browser smoke suite, complementary to the Vitest+RTL acceptance
suite. It runs against the production build (`npm run build` + `npm run
preview`) in Chromium and covers what jsdom cannot: real localStorage
across a full reload, real keyboard events, the real `window.confirm`
modal, real ARIA associations, and real CSS rendering.

- `npm run test:e2e` — runs Playwright. The `webServer` config in
  `playwright.config.js` builds and previews automatically, so no manual
  server is needed.
- `npm run test:all` — runs both suites (`npm test` + `npm run test:e2e`).
- `npm test` — Vitest only (fast inner loop); it does NOT run Playwright.
- Browser: **chromium only** at this stage. Adding firefox/webkit means
  adding `projects` entries in `playwright.config.js`.
- Specs live in `tests/e2e/`. The smoke suite (7 tests) is distinct from
  the RTL acceptance suite (`tests/acceptance/app.test.jsx`, 28 checks):
  RTL validates the 10 MVP criteria at the component level; Playwright
  validates real-browser behavior only.
- Manual tools: `npx playwright test --ui` opens the interactive debugger;
  `npx playwright codegen http://localhost:4173` records user flows into
  a spec file.

Gotcha: the `webServer` config builds and previews automatically. If
port 4173 is already in use, Playwright reuses the existing server
locally (`reuseExistingServer: !process.env.CI`); in CI it always starts
its own.

## Herramientas / MCPs

- **Context7** — skill en `C:\Users\Lenovo\.agents\skills\context7-mcp\SKILL.md`,
  server declarado en `~/.pi/agent/mcp.json` (`@upstash/context7-mcp@2.2.5`
  vía `npx -y`). Trae documentación actualizada de librerías (React,
  Vite, Playwright, Supabase, etc.) en vez de depender del
  entrenamiento. Patrón: `resolve-library-id(libraryName, query)` →
  `query-docs(libraryId, query)`. Una llamada por concepto, no
  combines varios en una sola query. Útil cuando la respuesta
  necesita datos que viven en la doc oficial.
- **Playwright MCP artifacts** — capturas de pantalla y otros
  artefactos que Playwright deja al ejercitar la app (no los
  outputs de `playwright test`) van a `.playwright-mcp/`. Ya está
  ignorado en `.gitignore` junto con `test-results/` y
  `playwright-report/`.

## Structure

- `src/main.jsx` mounts `<App />` into `#root`.
- `src/App.jsx` is the composition root: `StoreProvider` + `Shell`.
  `Shell` owns `currentFilter`; `useStore()` is the Context hook.
- `src/store/store.js` is the **external Store** (plain ESM, no React
  imports). `src/store/useTasks.js` is the React binding over
  `useSyncExternalStore`. Keep them that way: no React in the Store,
  no business logic in components.
- `src/components/{TaskForm,Filters,TaskList,TaskItem,TaskEditForm}.jsx`
  — each has a top-of-file JSDoc describing its contract. Read those
  before changing a component's behavior.
- `src/lib/announce.js` is a single helper that writes to the static
  `#app-announcer` div in `index.html`. Components call
  `announce(message)` instead of touching the DOM directly.
- `tests/unit/store.test.js` (Store) and `tests/acceptance/app.test.jsx`
  (user flows).
- `odd/tasks/` holds feature docs. `app-tareas-mvp.md` is the
  **historical** 8-task MVP plan — do not modify. `react-vite-migration.md`
  is the **closed** 10-task migration plan with commit-by-commit
  evidence.

## Gotchas (these will bite you)

- **`useStore` must stay a `function` declaration**, not `const = () => ...`.
  `TaskForm.jsx` and `TaskItem.jsx` import `useStore` from `../App.jsx`,
  and `App.jsx` imports them back. The cycle resolves because function
  declarations are hoisted in ESM; an arrow assignment would break the
  cycle and crash on mount.
- **The `<ul>` in `TaskList` has no `aria-live`.** The vanilla MVP had a
  double-announce bug from `aria-live` on the list plus the dedicated
  live region. The React code starts clean: action announcements go
  through `announce()` only. Don't add `aria-live` "for completeness"
  — that would re-introduce the bug.
- **`aria-invalid` and `aria-selected` must always be the literal
  strings `"true"` or `"false"`**, never absent. Tests and screen
  readers both depend on the attribute being present.
- **`localStorage` in jsdom is a getter-only property.** Tests that need
  a shim must use `vi.stubGlobal('localStorage', shim)` — direct
  `globalThis.localStorage = shim` throws under strict-mode ESM. See
  `tests/unit/store.test.js` for the pattern.
- **`window.fetch` is `undefined` in jsdom v25.** Tests for "no network"
  must use `vi.stubGlobal('fetch', mockFn)`, not `vi.spyOn(window, 'fetch')`.
- **React 18 concurrent mode defers commits.** In RTL tests, wrap
  `createRoot().render(...)` and `root.unmount()` in `act()` so the
  first `screen.*` query is deterministic. The acceptance suite does
  this in its `renderApp` helper.
- **`TaskItem` has local `isEditing` state.** After save or cancel,
  focus returns to the Edit button via a `wasEditingRef` + `useEffect`
  pair; the ref guard skips the initial mount. Don't replace this with a
  global "editingId" without thinking through the keyboard / focus
  interactions.
- **`currentFilter` lives in `App.jsx`**, not in `TaskList`. Filters
  reads it and writes it via `setCurrentFilter`. Moving it elsewhere
  will break the wiring.

## Code conventions

- English identifiers; Spanish for user-facing strings (button labels,
  error messages, announcements) and for feature docs in `odd/tasks/`.
  Module-level JSDoc tends to be English.
- `Object.freeze(...)` for shared config objects (`FILTERS` in
  `Filters.jsx`, `config` in `store.js`).
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`,
  `refactor:`). The project follows ODD with work-unit commits per task.
- Run `npm test` before committing on this branch.

## Don't

- Don't add a framework, a state library (Zustand / Redux), or a
  CSS-in-JS solution. Architecture was decided at the start of the
  migration and is locked.
- Don't switch the test runner or rewrite `vitest.config.js` to add a
  setup file. Matchers are registered by importing
  `@testing-library/jest-dom/vitest` at the top of the test file.
- Don't touch `odd/tasks/app-tareas-mvp.md` — historical MVP plan,
  kept for context.
