# Feature: añadir Playwright E2E como complemento de Vitest+RTL

## Goal

Añadir una capa de tests E2E real-browser con Playwright para
app-tareas, complementando la suite Vitest+RTL existente (no
reemplazándola). Los tests E2E corren contra el build de
producción (`npm run build` + `npm run preview`) en Chromium,
ejercitando el comportamiento real del navegador que Vitest+RTL
no cubre: localStorage entre recargas reales, eventos de teclado
nativos, `window.confirm` modal real, renderizado visual,
asociaciones ARIA reales entre tablist y tabpanel.

## Stack

- **@playwright/test** como devDep. Browser target: **chromium solo**
  al inicio (añadir firefox/webkit es trivial con `projects`).
- Tests corren contra `http://localhost:4173` (Vite preview) o
  contra el dev server (`http://localhost:5173`) según convenga.
  Decisión: **build + preview** para que el smoke test
  refleje el artefacto de producción (CSS extraído, bundle
  minificado).
- Scripts nuevos en `package.json`: `test:e2e` (corre la suite
  Playwright). `test` sigue corriendo solo Vitest.
- `playwright.config.js` (ESM, ya tenemos `"type": "module"` en
  el package).

## Alcance

**Incluye:**

- `playwright.config.js` con `testDir: 'tests/e2e'`,
  `fullyParallel: true`, `webServer` que arranca `npm run preview`,
  reporter `list` por defecto, timeout 15s por test, baseURL
  configurado.
- `tests/e2e/smoke.spec.js` con 5-7 smoke tests de alto valor
  que NO duplican los 28 acceptance checks de RTL — cada test
  cubre lo que solo un navegador real puede validar.
- `npx playwright install chromium` descarga el binario.
- `package.json`: `@playwright/test` como devDep, script
  `test:e2e: "playwright test"`, script `test:all: "npm test &&
  npm run test:e2e"`.
- `AGENTS.md`: añadir sección "E2E (Playwright)" con los comandos
  y el patrón de smoke vs acceptance.

**Fuera de alcance (no se hace ahora):**

- Reemplazar Vitest+RTL (mantener).
- Tests contra firefox/webkit (chromium solo).
- GitHub Actions workflow (puede venir como feature aparte).
- Visual regression con screenshots comparados (no en esta tarea).
- Recordatorios de `playwright codegen` / modo `--ui` (no se
  configuran ahora; se documentan en AGENTS.md para uso manual
  futuro).

## Acceptance criteria

1. `npm install` instala `@playwright/test` y el binario de
   chromium queda descargado (vía `npx playwright install
   chromium`).
2. `npm run test:e2e` ejecuta la suite y termina con todos los
   tests verdes.
3. `npm test` (Vitest) sigue corriendo los 92 tests existentes
   sin cambios; total combinado: 92 Vitest + N Playwright.
4. Los tests Playwright NO duplican los 28 acceptance checks de
   RTL — cada uno cubre algo que solo el navegador real valida.
5. `playwright.config.js` arranca el preview server
   automáticamente (no requiere paso manual previo).
6. AGENTS.md menciona Playwright, los comandos
   (`npm run test:e2e`, `npx playwright install --with-deps`,
   `npx playwright test --ui`), y cuándo usar E2E vs Vitest.

## Estructura de archivos (target)

```
app-tareas/
├── ...
├── playwright.config.js   # NUEVO: configuración + webServer
├── tests/
│   ├── unit/...
│   ├── acceptance/...
│   └── e2e/               # NUEVO
│       └── smoke.spec.js  # NUEVO: smoke suite contra build
├── package.json           # + @playwright/test, + scripts
└── AGENTS.md              # + sección E2E
```

## Plan de tareas (1 tarea, work-unit commit)

Esta es una feature de un solo commit porque todos los cambios
están acoplados (config + primer test + dep + script + doc). Si
el diff crece a más de ~250 LOC, dividir en dos (setup primero,
smoke después).

1. **Setup + smoke suite** — instalar Playwright, escribir
   `playwright.config.js`, escribir `tests/e2e/smoke.spec.js` con
   5-7 tests, actualizar `package.json` y `AGENTS.md`, verificar
   `npm run test:e2e` exit 0 y `npm test` sigue verde.

## Validación por tarea

- El commit work-unit documenta `how to verify` con los comandos
  exactos (`npm install`, `npx playwright install chromium`,
  `npm run build && npm run test:e2e`, `npm test`).

## Riesgos

- `npx playwright install chromium` descarga ~150 MB y puede
  tardar varios minutos en redes lentas. El worker debe ejecutarlo
  y verificar que termina antes de seguir.
- En Windows, `playwright install --with-deps` no aplica (es para
  Linux); basta con `npx playwright install chromium` sin flags.
- El webServer arranca `npm run preview` automáticamente; el primer
  test paga el coste del build (~1s según la tarea 10). No es
  problema.
- Tests que asumen estado limpio de localStorage pueden flakear
  si una corrida anterior dejó datos. El beforeEach del spec
  debe limpiar `localStorage` con `page.evaluate(...)` antes de
  cada test.

## Evidence / commits

- **Tarea 1 / Setup + smoke suite** — commit work-unit `a28f99c` (`feat(e2e): add Playwright as complementary real-browser smoke layer`). Archivos (7 files / 331 ins / 1 del):
  - `package.json` (+5/-1): añadido `@playwright/test@^1.63.0` a devDeps; scripts nuevos `test:e2e: "playwright test"` y `test:all: "npm test && npm run test:e2e"`. `"test"` sigue siendo `"vitest run"`.
  - `package-lock.json` (+46 líneas, autogenerado): lockfile actualizado por `npm install -D @playwright/test`.
  - `playwright.config.js` (nuevo, 27 líneas, ESM): `testDir: ./tests/e2e`, `fullyParallel: true`, `forbidOnly: !!process.env.CI`, `retries: process.env.CI ? 2 : 0`, `reporter: 'list'`, `timeout: 15_000`, `use.baseURL: 'http://localhost:4173'` + `trace: 'on-first-retry'`, projects `[{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]`, webServer `command: 'npm run build && npm run preview -- --port 4173'` con `timeout: 120_000` y `reuseExistingServer: !process.env.CI`.
  - `tests/e2e/smoke.spec.js` (nuevo, 98 líneas, 7 tests): helper `freshPage(page)` (goto / + localStorage.clear() + reload); los 7 tests cubren lo que jsdom no puede: 1) app boots and shows the shell, 2) creating a task adds it to the list and announces it, 3) the task survives a full page reload, 4) toggling a task marks it is-completed and changes the filter count, 5) keyboard navigation moves focus and changes the active filter, 6) deleting a task shows confirm and removes the task when accepted, 7) the announcement live region receives the filter change message. Locators accesibles (`getByRole`, `getByPlaceholder`, `name` regex con `^=`) en lugar de selectores de clase.
  - `AGENTS.md` (110 → 138 líneas): nueva sección `## E2E (Playwright)` entre Verify y Structure: qué es, comandos (`npm run test:e2e`, `test:all`, `npm test` solo Vitest), browser target (chromium only), smoke vs acceptance (RTL valida 10 criterios a nivel componente; Playwright valida comportamiento solo del navegador real), manual tools (`--ui`, `codegen`), gotcha del webServer.
  - `odd/tasks/playwright-e2e.md` (nuevo, 123 líneas, A en este commit): este feature doc, con plan y acceptance criteria.
  - `.gitignore` (+5 líneas): `test-results/`, `playwright-report/`, `playwright/.cache/` bajo `# Playwright artifacts` para evitar litter del working tree en futuras corridas.

  Implementación delegada a `gentle-ai-worker` con `## Allowed edit surfaces` cubriendo los 4 archivos del feature (playwright.config.js, tests/e2e/smoke.spec.js, package.json, AGENTS.md). El lockfile y el feature doc quedaron fuera de la superficie autorizada por necesidad (npm install modifica el lockfile) y por orquestación (parent lo creó antes de delegar). El worker ajustó el locator del test 6 (anclar a `/^Eliminar/` en lugar de `/eliminar/i`) porque un título de tarea que contuviera "Eliminar" hacía que el aria-label del botón Editar también matcheara — fix en el spec, no en la app.

  Validación independiente del parent: `npm test` → **92 passed (92)** en 15.15s; `npm run test:e2e` → **7 passed (7)** en 6.3s (incluye el coste del build que el webServer arranca automáticamente). Sin warnings ni errores en ninguna corrida.

  Decisions / fixes del parent (no delegados):
  - Añadido `.gitignore` (test-results/, playwright-report/, playwright/.cache/) que el worker reportó como artifact untracked fuera de su superficie autorizada.
  - Lockfile modificado pese a no estar en la superficie autorizada, necesario por `npm install -D @playwright/test`.

  Branch: `feat/playwright-e2e` (creada por el worker desde `main`). Listo para push y PR.

## Resumen del feature

- **Decisión:** Complemento E2E (NO reemplazo de Vitest+RTL). La suite RTL sigue siendo la red rápida de dev; Playwright es la capa que valida lo que jsdom no puede.
- **Total tests combinados:** 92 Vitest (rápido, in-process, jsdom) + 7 Playwright (real-browser, contra build de producción).
- **Comandos clave:**
  - `npm test` — Vitest (~15s, dev loop).
  - `npm run test:e2e` — Playwright (~6s adicionales, incluye build; CI-friendly).
  - `npm run test:all` — ambos en secuencia.
- **Browser target:** chromium solo al inicio. Añadir firefox/webkit es trivial: dos entradas `projects` más en `playwright.config.js`.
- **Webserver:** Playwright arranca `npm run build && npm run preview -- --port 4173` automáticamente. `reuseExistingServer: !process.env.CI` para no pisar un preview local.
- **Lo que NO se hizo:** firefox/webkit, GitHub Actions workflow, visual regression con screenshots, codegen como flujo diario. Todo es candidato para features ODD futuras si el usuario lo pide.
- **Compatibilidad:** Vitest+RTL sigue intacto (92/92). El feature es estrictamente aditivo.
