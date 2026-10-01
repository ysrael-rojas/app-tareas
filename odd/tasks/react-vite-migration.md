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

- **Tarea 1 / Tooling foundation** — commit work-unit `117eed0` (`chore(tooling): add Vite + Vitest + React project setup`). Archivos: `package.json` (27 líneas, React 18 + Vite 5 + Vitest 2 + RTL como devDeps), `vite.config.js` (11 líneas, plugin React, dev server puerto 5173), `vitest.config.js` (11 líneas, jsdom env, globals, incluye `tests/**/*.test.{js,jsx}`), `package-lock.json` (3179 líneas, lockfile de 172 paquetes), `.gitignore` actualizado con `node_modules/`, `dist/`, `coverage/`, `.vite/`, `.vitest-cache/`, OS junk y logs, y este mismo feature doc (188 líneas, plan de 10 tareas). Validación previa (delegada a `gentle-ai-verify`): `npm install` exit 0 en ~27s, `npx vite --version` → `vite/5.4.21`, `npx vitest --version` → `vitest/2.1.9`, binarios presentes en `node_modules/.bin/`, `npx vite build` produjo `dist/` end-to-end (4 módulos transformados, 192ms). Warnings informativos no bloqueantes: `whatwg-encoding@3.1.1` deprecado (transitivo de jsdom), 5 vulnerabilidades npm en devDeps transitivas.

- **Tarea 2 / Vite entry + HTML + CSS bootstrap** — commit work-unit `268a0c9` (`feat(ui): bootstrap React entry and render header shell`). Archivos: `index.html` (reescrito: -95/+3, removida la UI estática — form, filtros, lista, empty state — que migra a React en tareas siguientes; queda skip-link con `href="#root"`, footer, announcer `<div id="app-announcer">` y `<div id="root">` como mount point; script tag ahora apunta a `/src/main.jsx`), `src/main.jsx` (nuevo, 463 bytes: imports React + ReactDOM/client + `../styles.css`, App component inline que renderiza el header con título y subtítulo, `ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>)`). Validación previa (delegada dos veces a `gentle-ai-verify`): primera pasada FAIL porque `import './styles.css'` no resolvía desde `src/` (el archivo está en raíz); fix aplicado a `../styles.css` antes del commit; segunda pasada PASS: dev server arrancó en 411ms en puerto 5173, `curl /` → 200 con `<div id="root">` + script tag + title, `curl /src/main.jsx` → 200 con JS transformado (createRoot + jsxDEV), `curl /styles.css?direct` → 200 con CSS real (`:root {`), dev log sin `Pre-transform error` ni `Internal server error`, dev server terminado limpio.

- **Tarea 3 / Store + unit tests** — commit work-unit `7d101f6` (`feat(store): port Store to ESM module with unit test suite`). Archivos: `src/store/store.js` (nuevo, 224 líneas, port semántico de la Store: `config` frozen, `createStore` closure con `getAll`/`getById`/`add`/`update`/`toggle`/`remove`, helpers `normalizeTitle`/`normalizeDescription`/`isValidTaskShape`/`loadInitial`/`persist` exportados para tests; `makeId`/`nowIso` privados; JSDoc corto en cada export), `tests/unit/store.test.js` (nuevo, 425 líneas, 14 grupos / 54 it cases, shim de `localStorage` con `vi.stubGlobal` por la restricción de jsdom de `localStorage` como getter-only, `vi.useFakeTimers` para el avance determinista de `updatedAt`). Implementación delegada a `gentle-ai-worker` con `## Allowed edit surfaces` restringido a esos dos paths; `app.js` y el resto del repo intactos (verificado con `git status --short --untracked-files=all` y `git diff --stat -- app.js`). Validación: `npm test` corrido independientemente por el parent → `Test Files 1 passed (1)`, `Tests 54 passed (54)`, duration ~1.5s. Desviaciones del spec anotadas por el worker: (a) el spec decía "7 fields" para `isValidTaskShape` pero el fuente vanilla tiene 6 — se portaron los 6 correctos; (b) `makeId`/`nowIso` quedaron privados como detalles de implementación; (c) `getAll` copia defensiva superficial (slot-level), no deep — coincide con el contrato vanilla.

- **Tarea 4 / App shell + StoreProvider** — commit work-unit `3445268` (`feat(ui): wire Store pub-sub and App shell with StoreProvider`). Archivos: `src/store/store.js` (modificado, +42 líneas: API crece de 6 a 8 métodos con `subscribe(fn)` que devuelve unsubscribe y `getSnapshot()` que devuelve la referencia cruda del array `tasks` para `useSyncExternalStore`; `notify()` privado llamado tras `persist` en `add`/`update`/`remove`; `toggle` delega en `update`; `getAll` mantiene su semántica de copia defensiva), `src/store/useTasks.js` (nuevo, 24 líneas: hook `useTasks(store)` sobre `useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)` con JSDoc que aclara que el array devuelto debe tratarse como read-only), `src/App.jsx` (nuevo, 59 líneas: `StoreContext` + `StoreProvider` con `useState(() => createStore())` lazy init para garantizar una sola creación por mount + `useStore` hook fail-fast + `App` default export que envuelve `<Shell />`; Shell usa `useTasks(store)` y renderiza header + placeholder vivo con conteo de tareas como smoke test de la sincronización), `src/main.jsx` (modificado, 20 → 10 líneas: App inline eliminado; importa `App` desde `./App.jsx`; StrictMode y resto conservados), `tests/unit/store.test.js` (modificado, +140 líneas: nuevo `describe('store pub-sub')` con 10 tests cubriendo `subscribe` (registro, unsubscribe, notificaciones en add/update/toggle/remove, no-notify en ids inexistentes, múltiples suscriptores), `getSnapshot` (misma referencia entre calls, distinta tras mutación) e integración; los 54 tests anteriores intactos). Implementación delegada a `gentle-ai-worker` con `## Allowed edit surfaces` restringido a esos 5 paths; `app.js` y el resto del repo intactos. Validación: `npm test` independiente del parent → 64/64 pass en ~1.35s; dev server smoke test delegado a `gentle-ai-verify` → PASS (HTML + 4 recursos JS — main.jsx, App.jsx, store.js, useTasks.js — + CSS todos 200, dev log sin errores de Pre-transform/Internal server/Failed to resolve/SyntaxError, dev server terminado limpio). Patrón arquitectónico clave establecido: Store externa (no useReducer) + `useSyncExternalStore` como única vía de sincronización con React; React queda como capa de suscripción pura.

- **Tarea 5 / TaskForm + crear** — commit work-unit `1cfcca3` (`feat(ui): add create-task form with announcement and error handling`). Archivos: `src/lib/announce.js` (nuevo, 19 líneas: helper `announce(message)` que escribe en `#app-announcer`, no-op silencioso en SSR/tests sin document/region), `src/components/TaskForm.jsx` (nuevo, 83 líneas: form controlado title-only, `useStore` + `useState` para title/error + `useRef` para focus, submit llama `store.add({title})`; success limpia + anuncia `Tarea agregada: <title>` + refocusa; failure (RangeError) muestra mensaje exacto del MVP `El título no puede estar vacío ni pasar de 200 caracteres.` con `role="alert"` y lo anuncia; `aria-invalid` siempre `true`/`false`; `aria-describedby` vincula input al párrafo de error; `noValidate` para que la validación custom gane al browser), `src/App.jsx` (modificado, 59 → 53 líneas: removido el import de `useTasks` y el smoke-test count del Shell; importado `TaskForm`; Shell renderiza `<TaskForm />` dentro de `<main>` con el header; `useStore` sigue como `function` declaration para preservar el hoisting del import circular con `TaskForm`). Implementación delegada a `gentle-ai-worker` con `## Allowed edit surfaces` restringido a esos 3 paths. Validación: `npm test` independiente del parent → 64/64 pass (sin tests nuevos; cobertura del form end-to-end llega en tarea 9 con la suite de aceptación RTL); dev server smoke test delegado a `gentle-ai-verify` → PASS (7 recursos: HTML + main.jsx + App.jsx + TaskForm.jsx + announce.js + store.js + CSS, todos 200; cadena de imports React → App → TaskForm → store resuelta, import circular `App ↔ TaskForm` funcionando; dev log sin errores de JSX/imports; dev server terminado limpio). Gap conocido: ningún componente ejerce visiblemente el pub-sub de la Store hasta que `TaskList` llegue en tarea 6; la integración end-to-end (crear → persistir → recargar → ver en lista) se cubre en tarea 9.

- **Tarea 6 / TaskList + TaskItem + toggle** — commit work-unit `abff435` (`feat(ui): add task list with live toggle and stubbed actions`). Archivos: `src/components/TaskList.jsx` (nuevo, 58 líneas: useStore + useTasks, recibe `filter` por prop, mapea a TaskItem, empty state contextual con los tres mensajes del MVP — solo `No hay tareas...` alcanzable hasta que Filters active los otros dos; **sin `aria-live` en el `<ul>`** por decisión deliberada para no replicar el bug del doble anuncio del MVP vanilla; `data-testid` en ul y empty-state para la suite RTL de tarea 9), `src/components/TaskItem.jsx` (nuevo, 60 líneas: presentacional con task + callbacks `onToggle`/`onEdit`/`onDelete`; checkbox con `aria-label` dinámico `'Marcar "<title>" como completada/pendiente'`; title + description condicional; Edit/Delete como botones `type='button'` con `aria-disabled='true'` y SIN `onClick` — stubs hasta tarea 7, focuseables para que el modelo mental del usuario sea "estos existen, aún no están listos"; `data-id={task.id}` en el `<li>` para parity con vanilla y utilidad en tests; `useRef` en el checkbox reservado para focus management futuro), `src/App.jsx` (modificado, 53 → 83 líneas: añadidos imports `useState`, `announce`, `TaskList`; Shell obtiene `useStore` + `useState('all')` para `currentFilter`; define `handleToggle` (store.toggle + announce `Tarea completada: X` o `Tarea marcada como pendiente: X`) y stubs no-op `handleEdit`/`handleDelete` con parámetro `_id` para silenciar no-unused-vars; render = header + `<main>` con `<TaskForm />` + `<TaskList filter={currentFilter} onToggle onEdit onDelete />`; el estado del filtro vive en App para que Filters (tarea 8) pueda leerlo/escribirlo sin prop drilling; `useStore` sigue como `function` declaration). Implementación delegada a `gentle-ai-worker` con `## Allowed edit surfaces` restringido a esos 3 paths; `app.js` y el resto del repo intactos. Validación: `npm test` independiente del parent → 64/64 pass (sin tests nuevos; cobertura E2E en tarea 9); dev server smoke test delegado a `gentle-ai-verify` → PASS (10 recursos: HTML + main.jsx + App.jsx + TaskList.jsx + TaskItem.jsx + TaskForm.jsx + announce.js + store.js + useTasks.js + CSS, todos 200; cadena React → App → TaskList → TaskItem resuelta sin errores de JSX/imports; dev log sin `Pre-transform`/`Internal server`/`Failed to resolve`/`SyntaxError`; dev server terminado limpio). Decisión deliberada documentada: el `<ul>` de TaskList no incluye `aria-live` desde el inicio — el feedback de acción se canaliza por el announcer dedicado `#app-announcer`. La verificación del fix del doble anuncio en tarea 8 queda como "verificar que sigue sin estar", no como "añadir el fix".

- **Tarea 7 / TaskEditForm + delete** — commit work-unit `222ad71` (`feat(ui): wire inline edit form and delete with confirm`). Archivos: `src/components/TaskEditForm.jsx` (nuevo, 111 líneas: form de edición con useState para title/description/error + useRef para el input de título; mount enfoca+selecciona el input vía `useEffect(() => {...}, [])`; submit valida con `normalizeTitle` (defensa en profundidad: el Store vuelve a validar en `update()`); success llama `onSave({title, description})`, failure muestra `No se pudo guardar: el título no puede estar vacío.` con `role='alert'` y `aria-describedby` condicional; Cancel o Escape llaman `onCancel`; IDs dinámicos por task (`task-edit-title-${id}`, `task-edit-desc-${id}`, `task-edit-error-${id}`) para evitar colisiones de label/input), `src/components/TaskItem.jsx` (modificado, 60 → 96 líneas: `useState('isEditing')` local; cuando true renderiza `<TaskEditForm>` dentro del `<li>` con clase `task task--editing`; el `<li>` wrapper se preserva en ambas ramas para mantener `data-id` estable; patrón `wasEditingRef` + `useEffect` con dep `[isEditing]` para devolver foco al botón Editar SOLO en la transición editing→display (no en el mount inicial); prop renamed `onEdit` → `onUpdate`; botones Editar/Eliminar pasan de `aria-disabled` a `onClick` real), `src/components/TaskList.jsx` (modificado, 58 → 55 líneas: rename trivial `onEdit` → `onUpdate` en destructure, JSDoc, y forward a `<TaskItem>`), `src/App.jsx` (modificado, 83 → 96 líneas: `handleUpdate(id, patch)` llama `store.update` y anuncia `Tarea actualizada: <title>`; `handleDelete(id)` hace `store.getById` + `window.confirm('¿Eliminar la tarea "<title>"?')` + (si confirma) `store.remove` + announce `Tarea eliminada: <title>` + `document.getElementById('task-title')?.focus()`; el stub `handleEdit` se elimina; `<TaskList>` recibe `onUpdate` en lugar de `onEdit`; top JSDoc actualizado). El primer intento de delegación reveló un conflicto en el spec: el rename `onEdit`→`onUpdate` requería tocar `TaskList.jsx` para reenviar la prop, pero no estaba en el `## Allowed edit surfaces`; el worker reportó `interaction_required`, se re-lanzó con la superficie ampliada (opción 1), y se completó limpio. Implementación final delegada a `gentle-ai-worker` con `## Allowed edit surfaces` cubriendo los 4 paths. Validación: `npm test` independiente del parent → 64/64 pass (sin tests nuevos; cobertura E2E en tarea 9); dev server smoke test delegado a `gentle-ai-verify` → PASS (11 recursos: HTML + main.jsx + App.jsx + TaskList.jsx + TaskItem.jsx + TaskEditForm.jsx + TaskForm.jsx + announce.js + store.js + useTasks.js + CSS, todos 200; rename `onEdit`→`onUpdate` propagado confirmado — `App.jsx` servido tiene 0 ocurrencias de `handleEdit` y `TaskList.jsx` servido tiene 0 ocurrencias de `onEdit`; cadena de imports resuelta end-to-end; dev log sin errores de JSX/imports; dev server terminado limpio). Decisión documentada: el foco post-delete vuelve al input del TaskForm (lugar natural al que ir tras eliminar); cuando llegue Filters (tarea 8) se puede refinar para apuntar al tab "Todas" si el filtro activo queda vacío, en paridad con el MVP vanilla.

- **Tarea 8 / Filters (ARIA tabs)** — commit work-unit `382f8f3` (`feat(ui): add ARIA tabs Filters and wire tabpanel association`). Archivos: `src/components/Filters.jsx` (nuevo, 96 líneas: tres tabs Todas/Pendientes/Completadas en `role="tablist"` con `aria-label="Filtros de tareas"`; cada tab con `role="tab"`, id estable `filter-tab-${id}`, `aria-selected` siempre `"true"`/`"false"`, `aria-controls="task-list-panel"`, `data-filter`, `data-counter`; roving tabindex (active=0, otros=-1); counts vivos derivados de `useTasks`; click y teclado activan el filtro y anuncian `Filtro <label>: N tarea/tareas.` con pluralización; keyboard ArrowLeft/Right (wrap), Home/End con activación automática — paridad con el vanilla; single `activate(id)` entry point que guarda no-ops, llama `onChange` y anuncia; `FILTERS` y `LABEL_BY_ID` como `Object.freeze`), `src/components/TaskList.jsx` (modificado, 55 → 60 líneas: envuelve la lista/empty-state en `<div id="task-list-panel" role="tabpanel" aria-labelledby={`filter-tab-${filter}`} className="task-list-panel" data-testid="task-list-panel">`; empty state como hijo directo del tabpanel en vez de dentro del `<ul>`; **el `<ul>` permanece sin `aria-live`** por decisión deliberada para no replicar el bug del doble anuncio del MVP vanilla), `src/App.jsx` (modificado, 96 → 97 líneas: `import Filters`; Shell renderiza `<Filters currentFilter={currentFilter} onChange={setCurrentFilter} />` entre `<TaskForm />` y `<TaskList />`; currentFilter deja de estar fijado en `"all"` — los clicks del usuario lo cambian; `useStore` sigue como function declaration; top JSDoc actualizado). Implementación delegada a `gentle-ai-worker` con `## Allowed edit surfaces` restringido a esos 3 paths; `app.js` y el resto del repo intactos. Validación: `npm test` independiente del parent → 64/64 pass; dev server smoke test delegado a `gentle-ai-verify` → PASS (12 recursos: HTML + main.jsx + App.jsx + Filters.jsx + TaskList.jsx + TaskItem.jsx + TaskEditForm.jsx + TaskForm.jsx + announce.js + store.js + useTasks.js + CSS, todos 200; cadena React→App→Filters→useTasks resuelta; **verificación explícita crítica: 0 ocurrencias de `aria-live` en el TaskList.jsx servido** — bug fix del doble anuncio preservado; dev log sin errores de JSX/imports; dev server terminado limpio). Decisión sobre tamaño de feature: diff acumulado (main..HEAD) = 17 files / 4781 insertions / 95 deletions; la mayoría es `package-lock.json` autogenerado (3179); el código real revisable es ~700 líneas de componentes + 800 de tests + 200 del feature doc. Por encima del umbral de ~400 LOC mencionado en el plan, pero el feature es una migración coherente y dividir ahora forzaría un estado intermedio sin tests en `main`. **Decisión: NO dividir** — se mantiene como un solo feature y se nota en este doc por si el usuario quiere partirlo al armar el PR (opciones: react-core tareas 1-8 / react-finish tareas 9-10).

- **Tarea 9 / Acceptance suite (RTL)** — commit work-unit `b02e276` (`test(acceptance): port the 28-check MVP suite to React Testing Library`). Archivos: `tests/acceptance/app.test.jsx` (nuevo, 559 líneas: imports al inicio — `@testing-library/jest-dom/vitest` para registrar matchers sin tocar `vitest.config.js`, `act` de `react`, `screen`, `userEvent`, `createRoot`, `readFileSync`; helpers inline — `makeLocalStorage` (shim Map con el mismo patrón de `tests/unit/store.test.js`), `renderApp` (createRoot + act para que el commit del concurrent root sea síncrono y la primera consulta screen.* sea determinística), `setupUser`, `createTask`, `FILTER_LABELS`; 10 describe blocks con 28 it cases cubriendo los 10 criterios del MVP: C1 boot (3), C2 persistencia tras reload (3, vía cleanup+renderApp que recrea la Store desde localStorage stubbed), C3 toggle round-trip (3), C4 edit persiste (3), C5 delete con confirm (3, spy sobre `window.confirm`), C6 filtros + counts + aria-selected (5), C7 empty contextual (4), C8 sin red (`vi.stubGlobal('fetch', ...)` porque jsdom v25 no define `window.fetch`, spy sobre `XMLHttpRequest.prototype.open`, assert not.toHaveBeenCalled), C9 mobile-first (regex sobre `styles.css` leído con `readFileSync` + `path.join(process.cwd(), ...)`, en lugar de URL porque Vitest rechaza URLs no-file), C10 sin warnings de consola (2, arrays acumulados durante sesión completa)). Tres adaptaciones justificadas al entorno real por el worker: (a) `act` alrededor de render/unmount para determinismo con React 18 concurrent mode; (b) `vi.stubGlobal('fetch')` en lugar de spy directo sobre `window.fetch`; (c) `readFileSync` con cwd en lugar de `new URL(import.meta.url)`. Implementación delegada a `gentle-ai-worker` con `## Allowed edit surfaces` restringido a ese único path; `app.js` y el resto del repo intactos (verificado con `git status --short`). Validación: `npm test` independiente del parent → **92 passed (92)** en 14.86s (64 unit + 28 acceptance), 2 archivos, 0 warnings de act en la salida. El feature queda con **paridad funcional completa respecto al MVP vanilla, verificada por suite automatizada**. Pendiente solo el cierre (tarea 10: actualizar README, verificación final, borrar `app.js`).

- **Tarea 10 / README + verificación final + cierre** — commit work-unit `ea50a14` (`chore(release): close migration with README rewrite + delete app.js`). Tres cambios:
  1. `README.md` reescrito (80 → 138 líneas). Stack actualizado a React 18.3 + Vite 5.4 + Vitest 2.1 + @testing-library/react + jsdom; runtime deps solo `react` y `react-dom`. Secciones: Cómo desarrollar (`npm install` + `npm run dev` → :5173 con HMR), Cómo construir (`npm run build` → `dist/` con HTML + JS bundle + CSS extraído como archivo separado, distinto del dev donde Vite sirve CSS como módulo JS), Cómo testear (`npm test` → 92/92), Estructura (árbol completo de archivos rastreados, excluyendo `node_modules/`, `dist/`, `.engram/`, `coverage/`), Estado del proyecto (migración cerrada, 10/10 tareas; paridad funcional con el MVP vanilla), Decisiones de arquitectura (Store externa + `useSyncExternalStore` — no `useReducer`/Zustand/Redux; a11y a mano — no Radix/react-aria; sin `aria-live` en el `<ul>` — fix deliberado del bug del MVP vanilla; suite de tests en repo — reemplaza `/tmp/test-app-tareas/`), Cómo contribuir (flujo ODD con referencia a los dos feature docs como ejemplos).
  2. `app.js` eliminado (-636 líneas). El legacy vanilla ya no se referencia desde ningún módulo bajo `src/`, `tests/`, o `index.html`. Verificación: `grep -rnE "from ['\"].*app\.js|import ['\"].*app\.js"` en `src/`/`tests/`/`index.html` → 0 matches.
  3. Fix al comentario superior de `src/store/store.js` (+3/-3 líneas): el comentario decía "Port directo y sin cambios semánticos de la capa Store de `app.js`." — referencia histórica que quedaba colgando. Reescrito a "Capa canónica: la lógica de modelo y persistencia vive aquí, fuera de React. La app se suscribe vía `useSyncExternalStore` (`src/store/useTasks.js`) y la suite de unit tests verifica el comportamiento directamente."
  Implementación principal (README + delete) delegada a `gentle-ai-worker` con `## Allowed edit surfaces` restringido a README.md y app.js; el worker también ejecutó `npm run build` y confirmó exit 0 con bundle: CSS 7.33 kB (gzip 1.82 kB), JS 152.95 kB (gzip 49.28 kB), HTML 0.92 kB. El fix al comentario de `store.js` lo hizo el parent como cierre limpio: el worker lo reportó como dangling reference fuera de su superficie autorizada, pero es trivial y cierra el loop sin referencias históricas a archivos borrados. Validación final: `npm test` independiente del parent → **92/92 pass** en 15.33s (mismo conteo tras la eliminación de `app.js` y el fix del comentario).

## Resumen del feature (10/10 tareas cerradas)

- **Branch:** `feat/react-vite-migration` (desde `main`)
- **Diff total vs `main`:** ~18 archivos, ~5400 insertions, ~730 deletions (incluye `package-lock.json` de 3179 líneas autogenerado).
- **Código real revisable:** ~700 líneas de componentes + 1300 de tests + 200 del feature doc + 138 del README + 0 (el `app.js` se eliminó).
- **Tests:** **92/92 passing** (64 unit Store + 28 acceptance RTL).
- **Build:** `npm run build` exit 0; CSS extraído en producción.
- **Runtime deps:** solo `react` y `react-dom`.
- **Funcionalidad con paridad completa respecto al MVP vanilla:**
  - Crear tarea con validación (título 1-200 chars).
  - Editar inline (título + descripción).
  - Toggle completar / pendiente.
  - Eliminar con `window.confirm` y focus return.
  - Filtros Todas/Pendientes/Completadas con contadores vivos.
  - Persistencia versionada en `localStorage` (`app-tareas:v1`).
  - Accesibilidad: ARIA tabs, focus management, announcer a live region, errores visibles, navegación por teclado.

## Commits del feature (work-units, en orden)

| # | Hash | Título |
|---|---|---|
| 1 | `117eed0` | chore(tooling): add Vite + Vitest + React project setup |
| 2 | `268a0c9` | feat(ui): bootstrap React entry and render header shell |
| 3 | `7d101f6` | feat(store): port Store to ESM module with unit test suite |
| 4 | `3445268` | feat(ui): wire Store pub-sub and App shell with StoreProvider |
| 5 | `1cfcca3` | feat(ui): add create-task form with announcement and error handling |
| 6 | `abff435` | feat(ui): add task list with live toggle and stubbed actions |
| 7 | `222ad71` | feat(ui): wire inline edit form and delete with confirm |
| 8 | `382f8f3` | feat(ui): add ARIA tabs Filters and wire tabpanel association |
| 9 | `b02e276` | test(acceptance): port the 28-check MVP suite to React Testing Library |
| 10 | `ea50a14` | chore(release): close migration with README rewrite + delete app.js |

## Decisiones de arquitectura (consolidado)

- **Store externa a React.** `src/store/store.js` es un módulo ESM plano con API basada en closure (`getAll`, `getById`, `add`, `update`, `toggle`, `remove`, `subscribe`, `getSnapshot`). React se suscribe vía `useSyncExternalStore` (`src/store/useTasks.js`). El Store no importa React; los unit tests lo verifican directamente con un shim de `localStorage` (jsdom).
- **a11y a mano.** ARIA tabs hand-rolled en `Filters.jsx` (`role="tablist"`, `aria-selected` siempre "true"/"false", `aria-controls="task-list-panel"`, roving tabindex con activación automática en ArrowLeft/Right + Home/End). Focus management explícito en edit/cancel/delete. Announcer dedicado (`announce.js` → `#app-announcer`).
- **Sin `aria-live` en el `<ul>` de la lista.** El feedback de acción va por el announcer dedicado. Replicar el live region en la `<ul>` causaría doble anuncio (bug del MVP vanilla); el código React empieza limpio.
- **Vitest + RTL para todo.** `tests/unit/store.test.js` (64 tests) y `tests/acceptance/app.test.jsx` (28 checks de los 10 criterios del MVP). Suite automatizada en repo, sin sandbox externo.
- **Sin TypeScript, sin CSS modules, sin framework de estado externo, sin Radix/react-aria.** Decisiones de alcance elegidas por el usuario al inicio del feature.

## Estado tras el cierre

- App React + Vite funcional end-to-end, con paridad completa respecto al MVP vanilla, verificada por suite automatizada de 92 tests.
- `app.js` (vanilla legacy) eliminado.
- README documenta el stack y el workflow actualizados.
- Branch listo para push + PR. Decisión sobre splitting del PR queda al usuario (no se dividió durante el feature; el diff total es grande pero coherente).
