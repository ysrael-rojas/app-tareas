# App Tareas

Aplicación web para gestionar tareas personales. Frontend con React 18 +
Vite, persistencia local en `localStorage`. Sin backend, sin runtime
deps fuera de React.

## Stack

- **React 18.3** (componentes, hooks, `useSyncExternalStore`).
- **Vite 5.4** como dev server y bundler.
- **Vitest 2.1** + **@testing-library/react** + **jsdom** para tests
  (unit + acceptance, todo en repo).
- JavaScript ES2022, sin TypeScript.
- Persistencia: `localStorage` bajo la clave `app-tareas:v1`,
  versionada con `schemaVersion: 1`.
- Runtime deps: solo `react` y `react-dom`. El resto son devDeps.

## Cómo desarrollar

`npm install` y luego `npm run dev`. La app queda servida en
`http://localhost:5173` con HMR.

## Cómo construir

`npm run build` produce un bundle estático en `dist/`:
- `dist/index.html`
- `dist/assets/index-<hash>.js`
- `dist/assets/index-<hash>.css` (CSS extraído como archivo separado,
  distinto del dev server donde Vite lo sirve como módulo JS).

Para previsualizar el build localmente: `npm run preview`.

## Cómo testear

`npm test` ejecuta la suite completa:
- `tests/unit/store.test.js` — 64 tests del Store (CRUD, normalización,
  persistencia, defensive cases, pub-sub).
- `tests/acceptance/app.test.jsx` — 28 checks de aceptación que
  cubren los 10 criterios del MVP (crear + persistir, toggle, editar
  inline, eliminar con confirm, filtros con ARIA tabs, empty state
  contextual, sin red en runtime, mobile-first, sin warnings de
  consola).

Resultado actual: **92/92 passing**. `npm run test:watch` corre la
suite en modo watch para desarrollo.

## Estructura

```
app-tareas/
├── index.html              # Entry HTML; <script> apunta a /src/main.jsx
├── package.json            # Deps y scripts (dev, build, test, preview)
├── vite.config.js          # Vite + plugin React
├── vitest.config.js        # Vitest + jsdom + plugin React
├── styles.css              # Estilos mobile-first, sin CSS modules
├── src/
│   ├── main.jsx            # ReactDOM.createRoot; monta <App />
│   ├── App.jsx             # StoreProvider, Shell, currentFilter
│   ├── store/
│   │   ├── store.js        # createStore (CRUD + persistencia + pub-sub)
│   │   └── useTasks.js     # Hook sobre useSyncExternalStore
│   ├── components/
│   │   ├── TaskForm.jsx
│   │   ├── Filters.jsx     # ARIA tabs (role=tablist, roving tabindex)
│   │   ├── TaskList.jsx
│   │   ├── TaskItem.jsx    # Modo display y edit (state local)
│   │   └── TaskEditForm.jsx
│   └── lib/
│       └── announce.js     # Helper para escribir en #app-announcer
├── tests/
│   ├── unit/
│   │   └── store.test.js
│   └── acceptance/
│       └── app.test.jsx    # Suite RTL con los 10 criterios del MVP
└── odd/
    └── tasks/
        ├── app-tareas-mvp.md          # Plan MVP original (8/8, histórico)
        └── react-vite-migration.md    # Plan de migración (10/10, cerrado)
```

## Estado del proyecto

Migración a React + Vite cerrada (10/10 tareas en
`odd/tasks/react-vite-migration.md`). Funcionalidad con paridad
completa respecto al MVP vanilla:

- Crear tarea con validación de título (1-200 chars).
- Editar inline (título + descripción).
- Marcar como completada / pendiente (toggle).
- Eliminar con `window.confirm` y focus return.
- Filtrar por estado: Todas / Pendientes / Completadas, con
  contadores vivos.
- Persistencia versionada en `localStorage` (`app-tareas:v1`).
- Accesibilidad: ARIA tabs, focus management, announcer a live
  region, errores visibles, navegación por teclado.

Plan original del MVP en `odd/tasks/app-tareas-mvp.md` (histórico,
no se modifica).

## Decisiones de arquitectura

- **Store externa a React.** `src/store/store.js` es un módulo ESM
  plano con una API basada en closure (`getAll`, `getById`, `add`,
  `update`, `toggle`, `remove`, `subscribe`, `getSnapshot`). React
  se suscribe vía `useSyncExternalStore` (`src/store/useTasks.js`).
  No usamos `useReducer`, Zustand ni Redux: la lógica de modelo
  queda aislada de la UI y es trivialmente testeable.
- **a11y a mano.** ARIA tabs en `Filters.jsx` (roving tabindex,
  `aria-selected`, flechas + Home/End con activación automática).
  Focus management explícito al editar / cancelar / eliminar.
  Announcer dedicado (`announce.js` → `#app-announcer`). No
  usamos Radix UI ni react-aria; las primitivas son pocas y el
  control fino es mejor a mano.
- **Sin `aria-live` en el `<ul>` de la lista.** El feedback de
  acción va por el announcer dedicado. Replicar el live region
  en la `<ul>` causaría doble anuncio (bug que tenía el MVP
  vanilla; el código React empieza limpio).
- **Suite de tests en repo.** Vitest + jsdom + @testing-library/react.
  Los 28 checks de aceptación viven en `tests/acceptance/app.test.jsx`;
  los 64 unit tests del Store en `tests/unit/store.test.js`. Ya no
  hay un sandbox externo en `/tmp/`.

## Cómo contribuir

El flujo ODD sigue siendo el mismo del MVP:

1. Para una feature nueva, crear `odd/tasks/<feature>.md` con el plan
   (goal, stack, criterios de aceptación, lista de tareas, evidencia).
2. Implementar tarea por tarea. Cada tarea cierra con un commit
   `work-unit` (Conventional Commits) que incluye tests y docs
   junto al comportamiento.
3. Actualizar `odd/tasks/<feature>.md` con el hash del commit como
   evidencia al cerrar cada tarea. Si la tarea 1 crea el feature
   doc, la evidencia puede ir en un commit aparte; a partir de la
   tarea 2, idealmente en el mismo commit.
4. Si el plan crece y se decide partir el feature en dos PRs
   encadenadas, documentar la decisión de splitting en el propio
   feature doc (campo "Riesgos" o "Notas").
