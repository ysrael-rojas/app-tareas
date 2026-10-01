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

_(se actualiza al cerrar la tarea)_
