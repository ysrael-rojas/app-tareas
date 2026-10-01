# Feature: migración app-tareas a React + Vite

## Goal

Reescribir `app-tareas` como SPA React servida por Vite, preservando
funcionalidad, persistencia, accesibilidad y filosofía mobile-first del MVP.
Reemplazar el bundle vanilla-JS/ESM por un proyecto Vite estándar con build
de producción y suite de tests en repo.

## Stack

- **Vite 5** como dev server y bundler (`npm run dev`, `npm run build`).
- **React 18** como librería de UI (runtime dep).
- **JavaScript ES2022** (no TypeScript — decisión de alcance del usuario).
- **`styles.css` global** importado desde `src/main.jsx` (sin CSS modules en v1).
- **Vitest + @testing-library/react + jsdom** para tests (en repo, no en `/tmp`).
- Sin framework de estado externo: `useReducer` + Context para pasar la Store.

## Alcance

**Incluye:**

- Tooling: `package.json`, `vite.config.js`, `vitest.config.js`, `.gitignore`
  actualizado, `npm` scripts (`dev`, `build`, `test`, `preview`).
- Reestructuración: `src/main.jsx` como entry, `src/App.jsx` como shell,
  `src/store/store.js` con la lógica de modelo + persistencia (port directo
  de la `Store` actual), `src/components/` con los componentes de UI.
- Componentes: `TaskForm`, `Filters` (ARIA tabs a mano), `TaskList`,
  `TaskItem`, `TaskEditForm`, `App` (composition root + provider).
- A11y: ARIA tabs con `role="tablist"` + `aria-selected` + `tabindex` roving
  + navegación con flechas/Home/End; `role="status"` announcer; focus
  management al editar/eliminar/cancelar; `role="alert"` para errores de
  formulario. **Fix del doble `aria-live`** quitándolo del `<ul>` (el
  announcer dedicado cubre los anuncios; el `<ul>` re-renderiza de forma
  controlada por React).
- Tests: `tests/unit/store.test.js` (Vitest) cubre normalización, validación,
  shape check, CRUD, toggle, persistencia, version mismatch, JSON corrupto.
  `tests/acceptance/app.test.jsx` (Vitest + RTL) cubre los 10 criterios de
  aceptación del MVP migrados a React Testing Library.
- Documentación: `README.md` actualizado (filosofía cambia de "sin build, sin
  dependencias" a "build con Vite, sin runtime deps fuera de React"; sección
  nueva "Cómo desarrollar"; instrucciones de `npm run dev` reemplazan
  `python -m http.server`).

**Fuera de alcance (no se tocan):**

- Modelo de datos (`schemaVersion: 1`, shape, normalización, IDs).
- Persistencia: clave `localStorage: app-tareas:v1` se mantiene; código de
  `localStorage` se traspasa sin cambios semánticos.
- Estilos: `styles.css` se importa tal cual; los selectores siguen siendo
  válidos contra el árbol de componentes React.
- Deploy (`dist/` no se sube a GitHub Pages ni se configura hosting).
- TypeScript (queda como feature aparte si se pide).
- a11y libraries (Radix, react-aria) — el usuario eligió a11y a mano.
- Migración del bug de doble `aria-live` en una rama aparte (va dentro de
  este feature; la nueva estructura React lo resuelve naturalmente).

## Acceptance criteria

1. `npm install` instala dependencias desde un `package.json` versionado.
2. `npm run dev` arranca Vite, sirve la app en `http://localhost:5173` (o el
   puerto que asigne), con HMR funcional.
3. `npm run build` produce `dist/` con `index.html`, JS bundle y CSS
   extraído; el sitio carga desde `dist/` servido estáticamente.
4. `npm test` ejecuta la suite Vitest (unit + acceptance) y pasa.
5. Las 10 funcionalidades del MVP siguen operativas:
   1. Crear tarea persiste tras recargar.
   2. Toggle tachado y round-trip.
   3. Editar cambia título/descripción y persiste.
   4. Eliminar pide confirmación y desaparece.
   5. Filtros (todas/pendientes/completadas) muestran solo lo
      correspondiente y los contadores coinciden.
   6. Empty state contextual al filtro.
   7. Mobile-first usable a 360px.
   8. Sin red en runtime (verificable: bundle no hace fetches externos).
   9. Sin warnings de consola en uso normal.
   10. ARIA tabs operativas (`role="tablist"`, `aria-selected`, roving
       `tabindex`, flechas/Home/End).
6. El doble `aria-live` está resuelto: solo el announcer dedicado
   (`role="status"`) anuncia mensajes; el `<ul>` no es live region.
7. README explica cómo desarrollar (`npm install && npm run dev`), cómo
   construir (`npm run build`) y cómo testear (`npm test`).
8. `package.json` no incluye runtime deps más allá de `react` y `react-dom`.
9. Los IDs de tarea siguen siendo `crypto.randomUUID()` con fallback.
10. La clave de localStorage sigue siendo `app-tareas:v1`.

## Estructura de archivos (target)

```
app-tareas/
├── index.html              # entry HTML (apunta a /src/main.jsx)
├── package.json            # NUEVO: deps y scripts
├── vite.config.js          # NUEVO: plugin React
├── vitest.config.js        # NUEVO: jsdom env, setup files
├── styles.css              # SIN CAMBIOS semánticos (selectores válidos)
├── src/
│   ├── main.jsx            # NUEVO: ReactDOM.createRoot
│   ├── App.jsx             # NUEVO: composition root + StoreProvider
│   ├── store/
│   │   └── store.js        # NUEVO: createStore, config, normalize*
│   └── components/
│       ├── TaskForm.jsx
│       ├── Filters.jsx     # ARIA tabs a mano
│       ├── TaskList.jsx
│       ├── TaskItem.jsx
│       └── TaskEditForm.jsx
├── tests/
│   ├── setup.js            # jsdom shims si hace falta
│   ├── unit/
│   │   └── store.test.js
│   └── acceptance/
│       └── app.test.jsx
├── odd/
│   └── tasks/
│       ├── app-tareas-mvp.md        # historial (no se modifica)
│       └── react-vite-migration.md  # ESTE DOC
└── README.md               # actualizado
```

Eliminado: `app.js` (su contenido se distribuye en `src/store/store.js` y los componentes).

## Plan de tareas (10 unidades, work-unit commits)

1. **Tooling foundation** — `package.json` (deps + scripts), `vite.config.js`,
   `vitest.config.js`, `.gitignore` actualizado. Verificar `npm install` ok,
   `vite --version` y `vitest --version` disponibles.
2. **Vite entry + HTML + CSS bootstrap** — actualizar `index.html` para que
   apunte a `/src/main.jsx`, crear `src/main.jsx` con un componente trivial
   que monte "App Tareas" en `<header>`. Importar `styles.css` desde
   `main.jsx`. Verificar `npm run dev` arranca y se ve el header.
3. **Store + unit tests** — portar `createStore`, `config`, `normalizeTitle`,
   `normalizeDescription`, `isValidTaskShape`, `loadInitial`, `persist`,
   `makeId`, `nowIso` desde `app.js` a `src/store/store.js` sin cambios
   semánticos. Añadir `tests/unit/store.test.js` que cubra normalización,
   CRUD, persistencia simulada, version mismatch, JSON corrupto. Verificar
   `npm test` corre la suite y pasa.
4. **App shell + StoreProvider** — `src/App.jsx` instancia `createStore()`,
   expone su API vía Context. Render placeholder del shell completo
   (header + form vacío + lista vacía). Verificar render en dev.
5. **TaskForm + crear** — extraer `TaskForm.jsx`. Wire a Store via Context.
   Validación local + `store.add()` + `announce()` + focus reset. Verificar
   crear funciona, announcer anuncia, errores se muestran visibles.
6. **TaskList + TaskItem + toggle** — extraer `TaskList.jsx` y `TaskItem.jsx`.
   Toggle por checkbox con `announce()`. Render basado en filtro activo.
   Verificar crear→toggle→contadores coherentes.
7. **TaskEditForm + delete** — `TaskEditForm.jsx` (reemplaza `<li>` por
   versión editable en línea). `handleDelete` con `window.confirm()` y
   focus return. Verificar editar guarda, cancelar revierte, eliminar
   funciona con focus al filtro adecuado.
8. **Filters (ARIA tabs)** — `Filters.jsx` con `role="tablist"`, roles tab,
   `aria-selected`, `tabindex` roving, navegación con flechas/Home/End.
   Sin `aria-live` en el `<ul>` (fix del doble anuncio). Verificar
   navegación por teclado, contadores vivos, empty state contextual,
   announcer anuncia cambios de filtro.
9. **Acceptance suite (RTL)** — portar los 28 checks del MVP desde
   `/tmp/test-app-tareas/acceptance.mjs` a
   `tests/acceptance/app.test.jsx` con React Testing Library. Cubrir los 10
   criterios de aceptación del MVP. Verificar `npm test` los corre y pasa.
10. **README + verificación final + cierre** — actualizar `README.md`
    (filosofía, dev/build/test, eliminar sección `file://` porque Vite
    resuelve el problema). Verificar manualmente `npm run dev`,
    `npm run build`, `npm test`. Cerrar este feature doc con el hash del
    commit work-unit y un commit de evidencia si aplica.

## Validación por tarea

- Cada tarea cierra con un commit work-unit Conventional Commits.
- El cuerpo del commit documenta `how to verify` cuando aplique.
- Este feature doc se actualiza con el hash del commit al cerrar cada tarea.

## Riesgos

- **PR grande**: 10 commits en una sola rama pueden exceder ~400 LOC de
  diff. Mitigación: si el diff crece, dividir a mitad de camino en dos
  features encadenadas (core React + filters+a11y+tests) con un commit de
  transición en `main`. Decisión se toma en la tarea 8 según diff real.
- **HMR + `localStorage`**: la Store vive fuera de React (es un closure),
  no se reinicia entre HMR. Riesgo bajo; documentar para no sorprenderse.
- **Re-mount de componentes con keys**: si los IDs son inestables durante
  desarrollo, React puede perder foco entre renders. Mitigación: usar
  `key={task.id}` consistentemente.
- **a11y en React**: el patrón ARIA tabs hay que re-implementarlo a mano
  porque no usamos Radix. Es código ya escrito en el MVP; se porta
  directamente. Riesgo bajo.

## Evidence / commits

_(se actualiza al cerrar cada tarea)_
